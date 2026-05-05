/**
 * scout-block — Inherited from ClaudeKit.
 * Blocks expensive reads into directories that waste tokens.
 */

const BLOCKED_DIRS = [
  "node_modules",
  "__pycache__",
  ".git",
  "dist",
  "build",
  "DerivedData",
  ".build",
];

const input = JSON.parse(process.stdin.read() ?? "{}");
const toolInput = input?.tool_input ?? {};
const target =
  toolInput.command ?? toolInput.path ?? toolInput.pattern ?? "";

const blocked = BLOCKED_DIRS.some((dir) => target.includes(`/${dir}/`) || target.includes(`/${dir}`));

if (blocked) {
  console.error(`[scout-block] Blocked access to: ${target}`);
  process.exit(2); // non-zero = block the tool call
}

process.exit(0);
