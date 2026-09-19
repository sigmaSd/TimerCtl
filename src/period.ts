export const PERIOD_PRESETS = [
  { label: "Every 15 minutes", value: "15min" },
  { label: "Every 30 minutes", value: "30min" },
  { label: "Every hour", value: "1h" },
  { label: "Every 6 hours", value: "6h" },
  { label: "Every 12 hours", value: "12h" },
  { label: "Every day", value: "1d" },
] as const;

export type ValidatePeriodResult = { ok: true } | { ok: false; error: string };

export async function validatePeriod(spec: string): Promise<ValidatePeriodResult> {
  const cmd = new Deno.Command("systemd-analyze", {
    args: ["timespan", spec],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code === 0) return { ok: true };
  const msg = new TextDecoder().decode(stderr).trim();
  return { ok: false, error: msg || "Invalid time span" };
}
