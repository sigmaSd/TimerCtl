import { ensureDirs } from "./paths.ts";
import { uniqueSlug } from "./slug.ts";
import { validatePeriod } from "./period.ts";
import {
  daemonReload,
  disableNow,
  enableNow,
  showProps,
  startUnit,
  stopUnit,
} from "./systemctl.ts";
import { removeUnitFiles, timerUnitName, serviceUnitName, writeUnitFiles } from "./systemdUnits.ts";
import {
  type Job,
  deleteJobFiles,
  listJobs,
  listSlugs,
  readJob,
  readState,
  writeJobMeta,
  writeScript,
} from "./jobRegistry.ts";
import { ensureWrapperInstalled } from "./wrapperScript.ts";

export interface JobInput {
  name: string;
  script: string;
  periodPreset: string;
  customPeriod: string;
  notifyOnChangeOnly: boolean;
}

export interface FieldError {
  field: "name" | "script" | "period";
  message: string;
}

export function resolvePeriod(input: JobInput): string {
  return input.customPeriod.trim() || input.periodPreset;
}

export async function validateJobInput(input: JobInput): Promise<FieldError[]> {
  const errors: FieldError[] = [];
  if (!input.name.trim()) errors.push({ field: "name", message: "Name is required." });
  if (!input.script.trim()) errors.push({ field: "script", message: "Script cannot be empty." });
  const period = resolvePeriod(input);
  if (!period) {
    errors.push({ field: "period", message: "Choose a preset or enter a custom period." });
  } else {
    const v = await validatePeriod(period);
    if (!v.ok) {
      errors.push({ field: "period", message: `Invalid period "${period}": ${v.error}` });
    }
  }
  return errors;
}

export async function init(): Promise<void> {
  await ensureDirs();
  await ensureWrapperInstalled();
}

export async function createJob(input: JobInput): Promise<Job> {
  const slug = uniqueSlug(input.name, await listSlugs());
  const job: Job = {
    slug,
    name: input.name.trim(),
    period: resolvePeriod(input),
    notifyOnChangeOnly: input.notifyOnChangeOnly,
    createdAt: new Date().toISOString(),
  };
  await writeScript(slug, input.script);
  await writeJobMeta(slug, job);
  await writeUnitFiles(job);
  await daemonReload();
  await enableNow(timerUnitName(slug));
  return job;
}

export async function updateJob(slug: string, input: JobInput): Promise<Job> {
  const existing = await readJob(slug);
  const job: Job = {
    slug,
    name: input.name.trim(),
    period: resolvePeriod(input),
    notifyOnChangeOnly: input.notifyOnChangeOnly,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await writeScript(slug, input.script);
  await writeJobMeta(slug, job);
  await writeUnitFiles(job);
  await daemonReload();
  await enableNow(timerUnitName(slug));
  return job;
}

export async function deleteJob(slug: string): Promise<void> {
  await disableNow(timerUnitName(slug)).catch(() => {});
  await stopUnit(serviceUnitName(slug)).catch(() => {});
  await removeUnitFiles(slug);
  await daemonReload();
  await deleteJobFiles(slug);
}

export async function runJobNow(slug: string): Promise<void> {
  await startUnit(serviceUnitName(slug));
}

// Pauses/resumes a job's timer without touching its script/config/history.
// Re-enabling re-arms OnActiveSec=1min, so it fires again shortly after resume.
export async function setJobEnabled(slug: string, enabled: boolean): Promise<void> {
  if (enabled) {
    await enableNow(timerUnitName(slug));
  } else {
    await disableNow(timerUnitName(slug));
  }
}

export interface JobStatus extends Job {
  active: string;
  enabled: string;
  lastRun: string | null;
  changed: boolean | null;
}

export async function listJobsWithStatus(): Promise<JobStatus[]> {
  const jobs = await listJobs();
  return Promise.all(
    jobs.map(async (job) => {
      const [props, state] = await Promise.all([
        showProps(timerUnitName(job.slug), ["ActiveState", "UnitFileState"]),
        readState(job.slug),
      ]);
      return {
        ...job,
        active: props.ActiveState ?? "unknown",
        enabled: props.UnitFileState ?? "unknown",
        ...state,
      };
    }),
  );
}
