/**
 * ClaudeTaskExecutor — Phase 1 implementation of AgentExecutor.
 *
 * Runs inside Claude Code: agents are spawned as subagents via the Agent tool.
 * In practice, the "spawn" writes a structured prompt to a file which the
 * DebateRunner reads and injects into a Claude Code subagent invocation.
 *
 * Communication protocol: file-based (inherited from ClaudeKit).
 * Each agent writes its response to:
 *   {outputDir}/{sessionId}/round-{N}-{agentId}.md
 *
 * NOTE: Actual subagent spawning happens in Claude Code context (not in Node.js).
 * This executor generates the prompt files and instructions that Claude Code
 * executes. The DebateRunner orchestrates the flow.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition, AgentHandle, AgentResponse, AgentExecutor } from "./executor.js";
import { loadConfig } from "../config/loader.js";

export class ClaudeTaskExecutor implements AgentExecutor {
  private readonly outputDir: string;

  constructor() {
    const config = loadConfig();
    this.outputDir = config.teams.outputDir;
  }

  async spawn(agent: AgentDefinition, task: string, context: string): Promise<AgentHandle> {
    const sessionId = `${dateStamp()}-${slug(task)}`;
    const dir = join(this.outputDir, sessionId);
    mkdirSync(dir, { recursive: true });

    // Write the agent brief — Claude Code reads this when spawning the subagent
    const brief = buildAgentBrief(agent, task, context, dir, 1);
    writeFileSync(join(dir, `brief-${agent.id}.md`), brief, "utf8");

    return { agentId: agent.id, sessionId };
  }

  async send(handle: AgentHandle, message: string): Promise<AgentResponse> {
    const dir = join(this.outputDir, handle.sessionId);
    const round = detectCurrentRound(dir, handle.agentId) + 1;

    // Write follow-up prompt for next round
    const followUp = buildFollowUpPrompt(handle.agentId, message, round);
    writeFileSync(join(dir, `followup-r${round}-${handle.agentId}.md`), followUp, "utf8");

    // Read response written by the subagent (Claude Code fills this)
    return waitForResponse(dir, handle.agentId, round);
  }

  async terminate(handle: AgentHandle): Promise<void> {
    const dir = join(this.outputDir, handle.sessionId);
    writeFileSync(
      join(dir, `terminated-${handle.agentId}.md`),
      `Agent ${handle.agentId} terminated at ${new Date().toISOString()}\n`,
      "utf8",
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildAgentBrief(
  agent: AgentDefinition,
  task: string,
  context: string,
  dir: string,
  round: number,
): string {
  return `---
agent: ${agent.id}
role: ${agent.role}
round: ${round}
session_dir: ${dir}
---

# Agent Brief: ${agent.role}

## Context
${context}

## Task
${task}

## Your job this round
Phân tích task trên từ góc độ ${agent.role}.
Đề xuất hướng giải quyết cụ thể, bao gồm:
- Approach bạn đề xuất và lý do
- Rủi ro hoặc điểm cần chú ý
- Câu hỏi cần làm rõ (nếu có)

Giữ response ngắn gọn (≤300 words). Không implement — chỉ đề xuất hướng.

## Output
Ghi response vào: ${join(dir, `response-r${round}-${agent.id}.md`)}

Format:
\`\`\`markdown
# ${agent.role} — Round ${round}
## Đề xuất
## Rủi ro
## Câu hỏi
\`\`\`
`;
}

function buildFollowUpPrompt(agentId: string, message: string, round: number): string {
  return `---
agent: ${agentId}
round: ${round}
---

# Round ${round} — Phản biện

${message}

## Nhiệm vụ
Đọc các đề xuất trên. Với tư cách ${agentId}:
- Đồng ý với điểm nào? Tại sao?
- Phản biện điểm nào? Lý do cụ thể?
- Đề xuất hướng tổng hợp nếu có

Giữ response ≤200 words.
`;
}

function detectCurrentRound(dir: string, agentId: string): number {
  let round = 0;
  while (existsSync(join(dir, `response-r${round + 1}-${agentId}.md`))) round++;
  return round;
}

async function waitForResponse(
  dir: string,
  agentId: string,
  round: number,
  timeoutMs = 120_000,
): Promise<AgentResponse> {
  const responsePath = join(dir, `response-r${round}-${agentId}.md`);
  const start = Date.now();

  while (!existsSync(responsePath)) {
    if (Date.now() - start > timeoutMs) {
      return {
        agentId,
        content: `[timeout] ${agentId} did not respond within ${timeoutMs / 1000}s`,
        round,
        timestamp: new Date().toISOString(),
      };
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return {
    agentId,
    content: readFileSync(responsePath, "utf8"),
    round,
    timestamp: new Date().toISOString(),
  };
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30).replace(/-$/, "");
}
