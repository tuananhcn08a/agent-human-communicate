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

// Match dir as path segment: /dir, /dir/, dir/ at start, or preceded by space/tab
const blocked = BLOCKED_DIRS.some((dir) => {
  const re = new RegExp(`(^|[/\\s])${dir}([/\\s]|$)`);
  return re.test(target);
});

if (blocked) {
  console.error(`[scout-block] Blocked access to: ${target}`);
  process.exit(2); // non-zero = block the tool call
}

process.exit(0);
