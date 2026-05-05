/**
 * File generator — creates HMAF config files in the target project.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dir, "templates");

export type Stack =
  | "backend-node"
  | "frontend-react"
  | "ios-swift"
  | "python-backend"
  | "flutter-mobile"
  | "devops"
  | "general";

export type Module = "voice" | "teams" | "router";

export interface GenerateOptions {
  projectName: string;
  stacks: Stack[];
  modules: Module[];
  targetDir: string;
}

const STACK_LABELS: Record<Stack, string> = {
  "backend-node":    "Node.js / TypeScript backend",
  "frontend-react":  "React / Vite frontend",
  "ios-swift":       "iOS / Swift",
  "python-backend":  "Python backend",
  "flutter-mobile":  "Flutter mobile",
  devops:            "DevOps / Infrastructure",
  general:           "General purpose",
};

// Env keys each module needs
const MODULE_ENV_KEYS: Record<Module, string[]> = {
  voice:  ["SONIOX_API_KEY", "OPENAI_API_KEY (optional, for TTS)"],
  teams:  [],
  router: ["DEEPSEEK_API_KEY (for ios/simple tasks)", "QWEN_API_KEY (for web/backend tasks)"],
};

export function generate(opts: GenerateOptions): string[] {
  const { projectName, stacks, modules, targetDir } = opts;
  const created: string[] = [];

  // 1. .hmaf/config.json — skip if project already configured
  write(targetDir, ".hmaf/config.json", buildConfig(projectName, modules), created, { skipIfExists: true });

  // 2. .claude/agents/*.md — skip if project already has its own agent definitions
  for (const stack of stacks) {
    const agentFile = readTemplate(`agents/${stack}.md`).replace(/{{project}}/g, projectName);
    const agentName = getAgentName(stack);
    write(targetDir, `.claude/agents/${agentName}.md`, agentFile, created, { skipIfExists: true });
  }

  // Always add scrum-master (HMAF-specific, won't conflict with project agents)
  const smTemplate = readBuiltinScrumMaster(projectName);
  write(targetDir, ".claude/agents/scrum-master.md", smTemplate, created, { skipIfExists: true });

  // 3. .claude/settings.json — merge HMAF hooks, never overwrite existing config
  mergeSettings(targetDir, modules, created);

  // 4. .claude/commands/ — always write HMAF slash commands
  const hmafCmd = readFile(join(__dir, "../../.claude/commands/hmaf.md"));
  if (hmafCmd) write(targetDir, ".claude/commands/hmaf.md", hmafCmd, created);
  const sessionEndCmd = readFile(join(__dir, "../../.claude/commands/session-end.md"));
  if (sessionEndCmd) write(targetDir, ".claude/commands/session-end.md", sessionEndCmd, created);

  // 4b. .claude/hooks/ — copy hook scripts
  copyHooks(targetDir, created);

  // 5. .env.example — skip if project already has one
  write(targetDir, ".env.example", buildEnvExample(modules), created, { skipIfExists: true });

  // 6. Append HMAF section to CLAUDE.md (or create stub if missing)
  appendClaudeMd(targetDir, projectName, modules, stacks, created);

  return created;
}

// ── Builders ────────────────────────────────────────────────────────────────

function buildConfig(projectName: string, modules: Module[]): string {
  const config = {
    project: projectName,
    version: "0.1.0",
    modules: {
      voice:  modules.includes("voice"),
      teams:  modules.includes("teams"),
      router: modules.includes("router"),
    },
    sessionPrompt: true,
    routing: {
      architecture:   "claude-sonnet",
      research:       "claude-sonnet",
      planning:       "claude-sonnet",
      review:         "claude-sonnet",
      "ios-code":     modules.includes("router") ? "deepseek-v3" : "claude-sonnet",
      "backend-code": modules.includes("router") ? "qwen-plus"   : "claude-sonnet",
      "web-code":     modules.includes("router") ? "qwen-plus"   : "claude-sonnet",
      devops:         modules.includes("router") ? "qwen-plus"   : "claude-sonnet",
      "simple-fix":   modules.includes("router") ? "deepseek-v3" : "claude-sonnet",
      unknown:        "claude-sonnet",
    },
    providers: {
      "claude-sonnet": {
        model: "claude-sonnet-4-6",
        envKey: "ANTHROPIC_API_KEY",
        costPer1MInput: 3.0,
        costPer1MOutput: 15.0,
      },
      ...(modules.includes("router") ? {
        "deepseek-v3": {
          model: "deepseek-chat",
          baseUrl: "https://api.deepseek.com",
          envKey: "DEEPSEEK_API_KEY",
          costPer1MInput: 0.27,
          costPer1MOutput: 1.1,
        },
        "qwen-plus": {
          model: "qwen-plus",
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          envKey: "QWEN_API_KEY",
          costPer1MInput: 0.4,
          costPer1MOutput: 1.2,
        },
      } : {}),
    },
    teams: {
      executor: "claude-task",
      debateRounds: 2,
      pauseBetweenRounds: true,
      outputDir: "docs/hmaf-debates",
    },
    gate: { mode: "smart" },
    voice: {
      sttProvider: "soniox",
      ttsProvider: "macos",
      language: "en",
    },
  };
  return JSON.stringify(config, null, 2);
}

function buildSettings(modules: Module[]): string {
  const hooks: Record<string, unknown[]> = {
    SessionStart: [{
      matcher: ".*",
      hooks: [{ type: "command", command: "node .claude/hooks/session-init.cjs" }],
    }],
    PreToolUse: [{
      matcher: "Bash|Glob|Grep|Read|Edit|Write",
      hooks: [{ type: "command", command: "node .claude/hooks/scout-block.cjs" }],
    }],
  };

  return JSON.stringify({ hooks }, null, 2);
}

function buildEnvExample(modules: Module[]): string {
  const lines = [
    "# HMAF Environment Variables",
    "",
    "# Required: Claude (always needed)",
    "ANTHROPIC_API_KEY=sk-ant-...",
    "",
  ];

  if (modules.includes("voice")) {
    lines.push("# Module: Voice");
    lines.push("SONIOX_API_KEY=...         # get from soniox.com/dashboard");
    lines.push("OPENAI_API_KEY=sk-...      # optional: higher quality TTS");
    lines.push("");
  }

  if (modules.includes("router")) {
    lines.push("# Module: Router (cost optimization)");
    lines.push("DEEPSEEK_API_KEY=...       # platform.deepseek.com");
    lines.push("QWEN_API_KEY=...           # dashscope.aliyuncs.com");
    lines.push("");
  }

  lines.push("# HMAF settings");
  lines.push('HMAF_LOG_LEVEL=info         # silent | info');
  lines.push('HMAF_GATE_MODE=smart        # smart | strict | auto');

  return lines.join("\n") + "\n";
}

function appendClaudeMd(
  targetDir: string,
  projectName: string,
  modules: Module[],
  stacks: Stack[],
  created: string[],
): void {
  const claudePath = join(targetDir, "CLAUDE.md");
  const section = buildClaudeMdSection(projectName, modules, stacks);

  if (!existsSync(claudePath)) {
    writeFileSync(claudePath, `# ${projectName}\n\n${section}`, "utf8");
    created.push("CLAUDE.md (created)");
  } else {
    const existing = readFileSync(claudePath, "utf8");
    if (!existing.includes("## HMAF")) {
      writeFileSync(claudePath, existing + "\n\n" + section, "utf8");
      created.push("CLAUDE.md (appended HMAF section)");
    } else {
      created.push("CLAUDE.md (HMAF section already exists — skipped)");
    }
  }
}

function buildClaudeMdSection(projectName: string, modules: Module[], stacks: Stack[]): string {
  const activeModules = modules.length ? modules.join(", ") : "none";
  const stackList = stacks.map((s) => STACK_LABELS[s]).join(", ");

  return `## HMAF Configuration

**Project:** ${projectName}
**Active modules:** ${activeModules}
**Stacks:** ${stackList}

### Session start
Run \`/hmaf\` to choose session mode (Voice / Teams / Router).

### Model routing
${modules.includes("router")
  ? "Router active — tasks auto-routed to cheapest capable model. See .hmaf/config.json."
  : "Router not active — all tasks use Claude Sonnet. Enable with: add 'router' to modules in .hmaf/config.json."}

### Team Agents
${modules.includes("teams")
  ? "Teams mode available. Use /hmaf teams when facing complex cross-domain problems."
  : "Teams mode not active. Enable with: add 'teams' to modules in .hmaf/config.json."}

### Voice
${modules.includes("voice")
  ? "Voice active. Run \`npm run voice\` (or equivalent) in a separate terminal, then speak commands."
  : "Voice not active. Enable with: add 'voice' to modules in .hmaf/config.json."}
`;
}

// ── Utilities ────────────────────────────────────────────────────────────────

function readTemplate(relativePath: string): string {
  const fullPath = join(TEMPLATES_DIR, relativePath);
  try {
    return readFileSync(fullPath, "utf8");
  } catch {
    return `# Template not found: ${relativePath}\n`;
  }
}

function readFile(fullPath: string): string | null {
  try { return readFileSync(fullPath, "utf8"); } catch { return null; }
}

function readBuiltinScrumMaster(projectName: string): string {
  // Inline minimal scrum-master template
  return `---
name: scrum-master
description: Scrum Master / Agent Lead for ${projectName}
model: claude-sonnet-4-6
---

# Scrum Master — ${projectName}

## Role
Orchestrate the agent team. Decompose tasks, route to right agents,
track progress, enforce human gates. Never implement — only coordinate.

## Session protocol
At session start: read active task list, report status.
At session end: summarise what was done, what's next.

## Human gate — ALWAYS stop and ask for:
- Architecture changes
- Production deployments
- Breaking API/schema changes
- Any UX change visible to end users

## Do NOT gate:
- Bug fixes within approved scope
- Adding tests
- Updating docs
- Internal refactors that don't change public interface
`;
}

function getAgentName(stack: Stack): string {
  const map: Record<Stack, string> = {
    "backend-node":    "backend-dev",
    "frontend-react":  "web-dev",
    "ios-swift":       "ios-dev",
    "python-backend":  "backend-dev",
    "flutter-mobile":  "mobile-dev",
    devops:            "devops",
    general:           "developer",
  };
  return map[stack];
}

function copyHooks(targetDir: string, created: string[]): void {
  const hooksSource = join(__dir, "../../.claude/hooks");
  const hooksDest = join(targetDir, ".claude/hooks");
  mkdirSync(hooksDest, { recursive: true });
  for (const file of ["session-init.cjs", "scout-block.cjs"]) {
    const src = join(hooksSource, file);
    const dest = join(hooksDest, file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      created.push(`.claude/hooks/${file}`);
    }
  }
}

function write(
  targetDir: string,
  relPath: string,
  content: string,
  created: string[],
  opts: { skipIfExists?: boolean } = {},
): void {
  const fullPath = join(targetDir, relPath);
  if (opts.skipIfExists && existsSync(fullPath)) {
    created.push(`${relPath} (skipped — already exists)`);
    return;
  }
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  created.push(relPath);
}

function mergeSettings(targetDir: string, modules: Module[], created: string[]): void {
  const settingsPath = join(targetDir, ".claude/settings.json");
  const hmafHooks = JSON.parse(buildSettings(modules)) as { hooks: Record<string, unknown[]> };

  let existing: { hooks?: Record<string, unknown[]> } = {};
  if (existsSync(settingsPath)) {
    try { existing = JSON.parse(readFileSync(settingsPath, "utf8")); } catch { /* malformed — replace */ }
  }

  const merged = { ...existing, hooks: { ...(existing.hooks ?? {}) } };
  for (const [event, hookList] of Object.entries(hmafHooks.hooks)) {
    if (!merged.hooks[event]) {
      merged.hooks[event] = hookList;
    } else {
      // Add only hooks whose command isn't already present
      const existingCmds = new Set(
        (merged.hooks[event] as Array<{ hooks?: Array<{ command?: string }> }>)
          .flatMap((h) => (h.hooks ?? []).map((hh) => hh.command ?? "")),
      );
      for (const entry of hookList as Array<{ hooks?: Array<{ command?: string }> }>) {
        const cmds = (entry.hooks ?? []).map((hh) => hh.command ?? "");
        if (cmds.some((c) => !existingCmds.has(c))) {
          (merged.hooks[event] as unknown[]).push(entry);
        }
      }
    }
  }

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(merged, null, 2), "utf8");
  created.push(".claude/settings.json (merged HMAF hooks)");
}

export { STACK_LABELS };
