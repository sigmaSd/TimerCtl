import {
  JOBS_DIR,
  jobJsonPath,
  lastOutputPath,
  metaPath,
  scriptPath,
  stateDir,
} from "./paths.ts";

export interface JobMeta {
  name: string;
  period: string;
  notifyOnChangeOnly: boolean;
  createdAt: string;
}

export interface Job extends JobMeta {
  slug: string;
}

export async function listSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  try {
    for await (const entry of Deno.readDir(JOBS_DIR)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        slugs.push(entry.name.slice(0, -5));
      }
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  return slugs;
}

export async function readJob(slug: string): Promise<Job | null> {
  try {
    const meta = JSON.parse(await Deno.readTextFile(jobJsonPath(slug))) as JobMeta;
    return { slug, ...meta };
  } catch {
    return null;
  }
}

export async function listJobs(): Promise<Job[]> {
  const slugs = await listSlugs();
  const jobs = await Promise.all(slugs.map(readJob));
  return jobs.filter((j): j is Job => j !== null);
}

export const writeJobMeta = (slug: string, meta: JobMeta) =>
  Deno.writeTextFile(jobJsonPath(slug), JSON.stringify(meta, null, 2));

export const readScript = (slug: string) => Deno.readTextFile(scriptPath(slug));

export async function writeScript(slug: string, content: string): Promise<void> {
  const withShebang = content.startsWith("#!") ? content : `#!/usr/bin/env bash\n${content}`;
  await Deno.writeTextFile(scriptPath(slug), withShebang);
  await Deno.chmod(scriptPath(slug), 0o755);
}

export interface JobState {
  lastRun: string | null;
  changed: boolean | null;
}

export async function readState(slug: string): Promise<JobState> {
  try {
    const text = (await Deno.readTextFile(metaPath(slug))).trim();
    const [line1, line2] = text.split("\n");
    return {
      lastRun: line1 ?? null,
      changed: line2 === "changed:true" ? true : line2 === "changed:false" ? false : null,
    };
  } catch {
    return { lastRun: null, changed: null };
  }
}

export const readLastOutput = (slug: string) =>
  Deno.readTextFile(lastOutputPath(slug)).catch(() => "");

export async function deleteJobFiles(slug: string): Promise<void> {
  await Deno.remove(jobJsonPath(slug)).catch(() => {});
  await Deno.remove(scriptPath(slug)).catch(() => {});
  await Deno.remove(stateDir(slug), { recursive: true }).catch(() => {});
}
