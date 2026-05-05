/**
 * SubprocessExecutor — Phase 2 stub (future implementation).
 *
 * Each agent runs as an independent `tsx` subprocess.
 * Same file-based communication protocol as ClaudeTaskExecutor,
 * so DebateRunner requires zero changes when switching.
 *
 * TODO (Phase 2):
 *   - Spawn `tsx src/agents/agent-runner.ts` as child_process
 *   - Pipe system prompt + task via stdin
 *   - Agent writes response to file (same format as ClaudeTaskExecutor)
 *   - Support non-Claude models via OpenAI-compat API
 */

import type { AgentDefinition, AgentHandle, AgentResponse, AgentExecutor } from "./executor.js";

export class SubprocessExecutor implements AgentExecutor {
  async spawn(_agent: AgentDefinition, _task: string, _context: string): Promise<AgentHandle> {
    throw new Error(
      "SubprocessExecutor is not yet implemented. Set HMAF_EXECUTOR=claude-task to use the current executor.",
    );
  }

  async send(_handle: AgentHandle, _message: string): Promise<AgentResponse> {
    throw new Error("SubprocessExecutor is not yet implemented.");
  }

  async terminate(_handle: AgentHandle): Promise<void> {
    throw new Error("SubprocessExecutor is not yet implemented.");
  }
}
