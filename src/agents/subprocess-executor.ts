import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, writeFileSync } from "node:fs";
import type { AgentDefinition, AgentHandle, AgentResponse, AgentExecutor } from "./executor.js";
import { loadConfig } from "../config/loader.js";

const __dir = dirname(fileURLToPath(import.meta.url));
// Works both in dev (dist/agents/) and installed (node_modules/hmaf/dist/agents/)
const RUNNER_PATH = join(__dir, "agent-runner.js");

export class SubprocessExecutor implements AgentExecutor {
  private readonly outputDir: string;
  private readonly agentDefs = new Map<string, AgentDefinition>();

  constructor() {
    this.outputDir = loadConfig().teams.outputDir;
  }

  async spawn(agent: AgentDefinition, task: string, context: string): Promise<AgentHandle> {
    const sessionId = `${dateStamp()}-${slug(task)}`;
    this.agentDefs.set(agent.id, agent);

    await this.runAgent(agent, task, context, sessionId, 1);
    return { agentId: agent.id, sessionId };
  }

  async send(handle: AgentHandle, message: string): Promise<AgentResponse> {
    const agent = this.agentDefs.get(handle.agentId);
    if (!agent) throw new Error(`Unknown agent: ${handle.agentId} — was spawn() called?`);

    const dir = join(this.outputDir, handle.sessionId);
    const round = detectCurrentRound(dir, handle.agentId) + 1;

    await this.runAgent(agent, message, "", handle.sessionId, round);

    const outputFile = join(dir, `response-r${round}-${handle.agentId}.md`);
    return {
      agentId: handle.agentId,
      content: (await import("node:fs")).readFileSync(outputFile, "utf8"),
      round,
      timestamp: new Date().toISOString(),
    };
  }

  async terminate(handle: AgentHandle): Promise<void> {
    const dir = join(this.outputDir, handle.sessionId);
    writeFileSync(
      join(dir, `terminated-${handle.agentId}.md`),
      `Agent ${handle.agentId} terminated at ${new Date().toISOString()}\n`,
      "utf8",
    );
    this.agentDefs.delete(handle.agentId);
  }

  private async runAgent(
    agent: AgentDefinition,
    task: string,
    context: string,
    sessionId: string,
    round: number,
  ): Promise<void> {
    const outputFile = join(this.outputDir, sessionId, `response-r${round}-${agent.id}.md`);
    const config = loadConfig();
    const providerId = agent.model ?? config.routing["unknown"] ?? "claude-sonnet";

    const input = JSON.stringify({ agentId: agent.id, role: agent.role, expertise: agent.expertise, providerId, task, context, round, outputFile });

    await runSubprocess(RUNNER_PATH, input);
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function runSubprocess(runnerPath: string, stdinData: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [runnerPath], { stdio: ["pipe", "inherit", "inherit"] });

    child.stdin.write(stdinData);
    child.stdin.end();

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`agent-runner exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

function detectCurrentRound(dir: string, agentId: string): number {
  let round = 0;
  while (existsSync(join(dir, `response-r${round + 1}-${agentId}.md`))) round++;
  return round;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30).replace(/-$/, "");
}
