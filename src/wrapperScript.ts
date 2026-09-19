import { APP_DIR, WRAPPER_PATH } from "./paths.ts";

export const WRAPPER_SCRIPT = `#!/usr/bin/env bash
set -uo pipefail
SLUG="$1"
NAME="\${2:-$SLUG}"
MODE="\${3:-always}"
BASE="$HOME/.local/share/timerctl"
SCRIPT="$BASE/scripts/$SLUG.sh"
STATE="$BASE/state/$SLUG"
mkdir -p "$STATE"

if [[ -x "$SCRIPT" ]]; then
  OUTPUT="$("$SCRIPT" 2>&1)"
else
  OUTPUT="error: script not found or not executable: $SCRIPT"
fi

PREV_FILE="$STATE/last_output.txt"
CHANGED=true
if [[ -f "$PREV_FILE" ]] && diff -q "$PREV_FILE" <(printf '%s' "$OUTPUT") >/dev/null 2>&1; then
  CHANGED=false
fi
printf '%s' "$OUTPUT" > "$PREV_FILE"
printf '%s\\nchanged:%s\\n' "$(date -Iseconds)" "$CHANGED" > "$STATE/meta.txt"

if [[ "$MODE" == "on-change" && "$CHANGED" == "false" ]]; then
  exit 0
fi
notify-send "timerctl: $NAME" "$OUTPUT"
`;

export async function ensureWrapperInstalled(): Promise<void> {
  await Deno.mkdir(APP_DIR, { recursive: true });
  await Deno.writeTextFile(WRAPPER_PATH, WRAPPER_SCRIPT);
  await Deno.chmod(WRAPPER_PATH, 0o755);
}
