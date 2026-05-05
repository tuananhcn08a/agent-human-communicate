/**
 * DebateRunner — orchestrates a multi-agent debate session.
 *
 * Flow:
 *   Round 1: Each agent proposes independently
 *   [User can intervene after each round]
 *   Round 2: Agents read all proposals → rebut / agree / synthesize
 *   ...repeat up to config.teams.debateRounds
 *   Final: Scrum Master synthesizes consensus
 *
 * Executor-agnostic: works with any AgentExecutor implementation.
 */

import { createInterface } from "node:readline";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { AgentExecutor, AgentDefinition, AgentHandle, AgentResponse } from "./executor.js";
import { ClaudeTaskExecutor } from "./claude-task-executor.js";
import { SubprocessExecutor } from "./subprocess-executor.js";
import { loadConfig } from "../config/loader.js";
import { getExecutorType } from "./executor.js";

export interface DebateInput {
  topic: string;          // brief description of the problem
  context: string;        // full context: codebase state, constraints, etc.
  agents: AgentDefinition[];
}

export interface DebateResult {
  topic: string;
  rounds: DebateRound[];
  consensus: string;
  sessionDir: string;
}

interface DebateRound {
  number: number;
  responses: AgentResponse[];
  userIntervention?: string;
}

export function createExecutor(): AgentExecutor {
  const type = getExecutorType();
  if (type === "subprocess") return new SubprocessExecutor();
  return new ClaudeTaskExecutor();
}

export async function runDebate(input: DebateInput): Promise<DebateResult> {
  const config = loadConfig();
  const maxRounds = config.teams.debateRounds;
  const pauseEnabled = config.teams.pauseBetweenRounds;
  const executor = createExecutor();

  console.log(`\n[teams] Starting debate: "${input.topic}"`);
  console.log(`[teams] Agents: ${input.agents.map((a) => a.id).join(", ")}`);
  console.log(`[teams] Rounds: ${maxRounds}\n`);

  // Spawn all agents in parallel for round 1
  const handles: AgentHandle[] = [];
  for (const agent of input.agents) {
    const handle = await executor.spawn(agent, input.topic, input.context);
    handles.push(handle);
    console.log(`[teams] ↑ Spawned: ${agent.id}`);
  }

  const rounds: DebateRound[] = [];
  let sessionDir = "";

  for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`[teams] Round ${roundNum}/${maxRounds}`);
    console.log("─".repeat(60));

    // Collect responses from all agents
    const responses: AgentResponse[] = [];

    if (roundNum === 1) {
      // Round 1: initial proposals (executor already spawned them with brief)
      console.log("[teams] Waiting for agent proposals...\n");
      for (const handle of handles) {
        // For ClaudeTaskExecutor, Claude Code will fill the response files.
        // This prints the brief path so user knows where to look.
        console.log(`[teams] ${handle.agentId}: see brief-${handle.agentId}.md`);
        responses.push({
          agentId: handle.agentId,
          content: `[pending — agent ${handle.agentId} writing to response-r1-${handle.agentId}.md]`,
          round: 1,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Round 2+: send all round-1 proposals to each agent for rebuttal
      const prevRound = rounds[roundNum - 2];
      if (!prevRound) break;

      const allProposals = prevRound.responses
        .map((r) => `### ${r.agentId}\n${r.content}`)
        .join("\n\n");

      const message = `## Đề xuất từ các agents khác (Round ${roundNum - 1})\n\n${allProposals}\n\n---\nHãy phản biện / đồng ý / tổng hợp.`;

      for (const handle of handles) {
        const response = await executor.send(handle, message);
        responses.push(response);
        console.log(`\n[${response.agentId}]`);
        console.log(response.content);
      }
    }

    const round: DebateRound = { number: roundNum, responses };
    if (sessionDir === "" && handles[0]) sessionDir = handles[0].sessionId;

    // Persist round to file
    persistRound(config.teams.outputDir, sessionDir, round, input.topic);

    // User intervention point
    if (pauseEnabled && roundNum < maxRounds) {
      const intervention = await promptIntervention(roundNum);
      if (intervention) {
        round.userIntervention = intervention;
        console.log(`[teams] Injecting your input into round ${roundNum + 1}`);
      }
    }

    rounds.push(round);
  }

  // Terminate agents
  for (const handle of handles) {
    await executor.terminate(handle);
  }

  // Generate consensus summary
  const consensus = buildConsensusPrompt(input.topic, rounds);
  const consensusPath = join(config.teams.outputDir, sessionDir, "consensus.md");
  writeFileSync(consensusPath, consensus, "utf8");
  console.log(`\n[teams] Consensus written to: ${consensusPath}`);
  console.log("[teams] Paste the consensus file to Claude Code for final synthesis.\n");

  return { topic: input.topic, rounds, consensus, sessionDir };
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function promptIntervention(roundNum: number): Promise<string | undefined> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question(
      `\n[teams] Round ${roundNum} done. Can thiệp? (Enter để bỏ qua / gõ để inject vào round tiếp): `,
      (answer) => {
        rl.close();
        resolve(answer.trim() || undefined);
      },
    );
  });
}

function persistRound(outputDir: string, sessionId: string, round: DebateRound, topic: string): void {
  const dir = join(outputDir, sessionId);
  mkdirSync(dir, { recursive: true });

  const content = [
    `# Round ${round.number} — ${topic}`,
    `**Date:** ${new Date().toISOString()}`,
    "",
    ...round.responses.map((r) => `## ${r.agentId}\n${r.content}`),
    round.userIntervention ? `\n## User Intervention\n${round.userIntervention}` : "",
  ].join("\n");

  writeFileSync(join(dir, `round-${round.number}.md`), content, "utf8");
}

function buildConsensusPrompt(topic: string, rounds: DebateRound[]): string {
  const allRounds = rounds
    .map((r) => {
      const responses = r.responses.map((resp) => `### ${resp.agentId}\n${resp.content}`).join("\n\n");
      const intervention = r.userIntervention ? `\n### User Input\n${r.userIntervention}` : "";
      return `## Round ${r.number}\n${responses}${intervention}`;
    })
    .join("\n\n---\n\n");

  return `# Consensus Request — ${topic}

Dưới đây là toàn bộ debate giữa các agents.
Hãy tổng hợp thành một quyết định cuối cùng:
1. Hướng được đồng thuận nhiều nhất
2. Điểm còn tranh luận (nếu có)
3. Recommendation cụ thể để implement

---

${allRounds}
`;
}
