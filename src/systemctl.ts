export interface CmdResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function run(args: string[]): Promise<CmdResult> {
  const cmd = new Deno.Command("systemctl", {
    args: ["--user", ...args],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

export const daemonReload = () => run(["daemon-reload"]);
export const enableNow = (unit: string) => run(["enable", "--now", unit]);
export const disableNow = (unit: string) => run(["disable", "--now", unit]);
export const startUnit = (unit: string) => run(["start", unit]);
export const stopUnit = (unit: string) => run(["stop", unit]);

export async function isAvailable(): Promise<boolean> {
  try {
    return (await run(["--version"])).code === 0;
  } catch {
    return false;
  }
}

export async function showProps(
  unit: string,
  props: string[],
): Promise<Record<string, string>> {
  const { stdout } = await run(["show", unit, "-p", props.join(",")]);
  const out: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}
