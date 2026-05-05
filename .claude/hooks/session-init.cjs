/**
 * session-init — Generic HMAF session context injector.
 *
 * Behaviour:
 *   - If .hmaf/config.json exists → project using HMAF, show module status + mode hint
 *   - If docs/03-session-state/latest.md exists → HMAF dev mode, show last session state
 */

const { execSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

const root = process.cwd();

function tryRead(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// HMAF dev mode — show last session state
const sessionState = tryRead(join(root, "docs/03-session-state/latest.md"));
const activePhase = tryRead(join(root, "docs/02-phases/active-phase.md"));

if (sessionState || activePhase) {
  const phaseLine = activePhase?.split("\n").find(l => l.startsWith("**Phase")) ?? "";
  const priorityLine = sessionState?.split("\n").find(l => l.includes("Next session priority")) ?? "";
  const blockedLine = sessionState?.split("\n").find(l => l.includes("Blocked:")) ?? "";

  console.log("[HMAF] ══════════════════════════════════════");
  if (phaseLine) console.log(`[HMAF] ${phaseLine.replace(/\*\*/g, "").trim()}`);
  if (priorityLine) console.log(`[HMAF] ${priorityLine.replace(/\*\*/g, "").trim()}`);
  if (blockedLine && !blockedLine.includes("none") && !blockedLine.includes("[]")) {
    console.log(`[HMAF] ${blockedLine.replace(/\*\*/g, "").trim()}`);
  }
  console.log("[HMAF] Dùng /hmaf để chọn session mode");
  console.log("[HMAF] ══════════════════════════════════════");
  process.exit(0);
}

// Project-using-HMAF mode — show module status
const configPath = join(root, ".hmaf/config.json");
if (existsSync(configPath)) {
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const mods = config.modules ?? {};
    const active = Object.entries(mods)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none";

    console.log(`[HMAF] Project: ${config.project ?? "unnamed"} | Modules: ${active}`);
    console.log("[HMAF] Dùng /hmaf để chọn session mode (Voice / Teams / Router)");
  } catch {
    console.log("[HMAF] Config parse error — check .hmaf/config.json");
  }
}

process.exit(0);
