import {
  serviceUnitName,
  serviceUnitPath,
  timerUnitName,
  timerUnitPath,
} from "./paths.ts";
import type { Job } from "./jobRegistry.ts";

// systemd unit-file value quoting: '%' must be doubled, and the ExecStart=
// line is whitespace-split unless a segment is wrapped in double quotes.
export function escapeUnitArg(s: string): string {
  const percentDoubled = s.replace(/%/g, "%%");
  const escaped = percentDoubled.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function renderServiceUnit(job: Job): string {
  const mode = job.notifyOnChangeOnly ? "on-change" : "always";
  return `[Unit]
Description=timerctl job: ${job.name}

[Service]
Type=oneshot
ExecStart=%h/.local/share/timerctl/wrapper.sh ${job.slug} ${escapeUnitArg(job.name)} ${mode}
`;
}

export function renderTimerUnit(job: Job): string {
  return `[Unit]
Description=timerctl timer: ${job.name}

[Timer]
OnActiveSec=1min
OnUnitActiveSec=${job.period}
Persistent=true

[Install]
WantedBy=timers.target
`;
}

export async function writeUnitFiles(job: Job): Promise<void> {
  await Deno.writeTextFile(serviceUnitPath(job.slug), renderServiceUnit(job));
  await Deno.writeTextFile(timerUnitPath(job.slug), renderTimerUnit(job));
}

export async function removeUnitFiles(slug: string): Promise<void> {
  for (const p of [serviceUnitPath(slug), timerUnitPath(slug)]) {
    await Deno.remove(p).catch(() => {});
  }
}

export { serviceUnitName, timerUnitName };
