export const HOME = Deno.env.get("HOME") ??
  (() => {
    throw new Error("HOME env var not set");
  })();

export const APP_DIR = `${HOME}/.local/share/timerctl`;
export const SCRIPTS_DIR = `${APP_DIR}/scripts`;
export const JOBS_DIR = `${APP_DIR}/jobs`;
export const STATE_DIR = `${APP_DIR}/state`;
export const WRAPPER_PATH = `${APP_DIR}/wrapper.sh`;
export const SYSTEMD_USER_DIR = `${HOME}/.config/systemd/user`;
// systemd writes a Persistent=true timer's "last triggered" bookkeeping here;
// it never cleans this up itself when a unit is removed, so we must.
export const TIMER_STAMPS_DIR = `${HOME}/.local/share/systemd/timers`;

export const serviceUnitName = (slug: string) => `timerctl-${slug}.service`;
export const timerUnitName = (slug: string) => `timerctl-${slug}.timer`;
export const serviceUnitPath = (slug: string) =>
  `${SYSTEMD_USER_DIR}/${serviceUnitName(slug)}`;
export const timerUnitPath = (slug: string) =>
  `${SYSTEMD_USER_DIR}/${timerUnitName(slug)}`;
export const timerStampPath = (slug: string) =>
  `${TIMER_STAMPS_DIR}/stamp-${timerUnitName(slug)}`;
export const jobJsonPath = (slug: string) => `${JOBS_DIR}/${slug}.json`;
export const scriptPath = (slug: string) => `${SCRIPTS_DIR}/${slug}.sh`;
export const stateDir = (slug: string) => `${STATE_DIR}/${slug}`;
export const lastOutputPath = (slug: string) =>
  `${stateDir(slug)}/last_output.txt`;
export const metaPath = (slug: string) => `${stateDir(slug)}/meta.txt`;

export async function ensureDirs(): Promise<void> {
  for (const d of [APP_DIR, SCRIPTS_DIR, JOBS_DIR, STATE_DIR, SYSTEMD_USER_DIR]) {
    await Deno.mkdir(d, { recursive: true });
  }
}
