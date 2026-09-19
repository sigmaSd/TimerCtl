import * as jobService from "../src/jobService.ts";
import { listJobsWithStatus } from "../src/jobService.ts";
import { readLastOutput, readScript } from "../src/jobRegistry.ts";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

async function main() {
  await jobService.init();
  const [cmd, ...rest] = Deno.args;

  switch (cmd) {
    case "create": {
      const name = flag(rest, "name");
      const script = flag(rest, "script");
      const period = flag(rest, "period") ?? "1h";
      const notifyOnChangeOnly = hasFlag(rest, "notify-on-change");
      if (!name || !script) {
        console.error("Usage: create --name <name> --script <script> --period <period> [--notify-on-change]");
        Deno.exit(1);
      }
      const errors = await jobService.validateJobInput({
        name,
        script,
        periodPreset: "",
        customPeriod: period,
        notifyOnChangeOnly,
      });
      if (errors.length) {
        console.error("Validation errors:", errors);
        Deno.exit(1);
      }
      const job = await jobService.createJob({
        name,
        script,
        periodPreset: "",
        customPeriod: period,
        notifyOnChangeOnly,
      });
      console.log("Created:", job);
      break;
    }
    case "list": {
      const jobs = await listJobsWithStatus();
      for (const j of jobs) {
        console.log(
          `${j.slug}\t${j.name}\tperiod=${j.period}\tenabled=${j.enabled}\tactive=${j.active}\tlastRun=${j.lastRun}\tchanged=${j.changed}\tnotifyOnChangeOnly=${j.notifyOnChangeOnly}`,
        );
      }
      break;
    }
    case "run": {
      const slug = rest[0];
      if (!slug) {
        console.error("Usage: run <slug>");
        Deno.exit(1);
      }
      await jobService.runJobNow(slug);
      console.log("Ran:", slug);
      break;
    }
    case "log": {
      const slug = rest[0];
      if (!slug) {
        console.error("Usage: log <slug>");
        Deno.exit(1);
      }
      console.log("--- script ---");
      console.log(await readScript(slug));
      console.log("--- last output ---");
      console.log(await readLastOutput(slug));
      break;
    }
    case "delete": {
      const slug = rest[0];
      if (!slug) {
        console.error("Usage: delete <slug>");
        Deno.exit(1);
      }
      await jobService.deleteJob(slug);
      console.log("Deleted:", slug);
      break;
    }
    case "enable": {
      const slug = rest[0];
      if (!slug) {
        console.error("Usage: enable <slug>");
        Deno.exit(1);
      }
      await jobService.setJobEnabled(slug, true);
      console.log("Enabled:", slug);
      break;
    }
    case "disable": {
      const slug = rest[0];
      if (!slug) {
        console.error("Usage: disable <slug>");
        Deno.exit(1);
      }
      await jobService.setJobEnabled(slug, false);
      console.log("Disabled:", slug);
      break;
    }
    default:
      console.error("Usage: timerctl-cli.ts <create|list|run|log|delete|enable|disable> ...");
      Deno.exit(1);
  }
}

await main();
