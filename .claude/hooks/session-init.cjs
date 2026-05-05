/**
 * session-init — Injects minimal context into every new session.
 * Outputs a brief status line that appears at session start.
 */

const { execSync } = require("child_process");

try {
  const branch = execSync("git -C /Users/anhdt14/Workspace/Side-project/bap-bean-book rev-parse --abbrev-ref HEAD 2>/dev/null", {
    encoding: "utf8",
  }).trim();

  const activePhase = execSync(
    "cat /Users/anhdt14/Workspace/Side-project/bap-bean-book/docs/04-phases/claude-active-phase.md 2>/dev/null | head -5",
    { encoding: "utf8" },
  ).trim();

  console.log(`[HMAF] bap-bean-book branch: ${branch}`);
  console.log(`[HMAF] ${activePhase.split("\n")[0] ?? "No active phase"}`);
} catch {
  // Silently skip if bap-bean-book is unavailable
}

process.exit(0);
