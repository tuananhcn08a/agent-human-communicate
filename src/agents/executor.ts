/**
 * AgentExecutor interface — transport-agnostic agent spawning.
 *
 * Implementations:
 *   ClaudeTaskExecutor  — Phase 1, native Claude Code Agent tool
 *   SubprocessExecutor  — Phase 2, tsx subprocess (future)
 *
 * Business logic (DebateRunner) only depends on this interface,
 * so switching executor requires zero changes to debate logic.
 */

export interface AgentDefinition {
  id: string;          // e.g. "backend-dev"
  role: string;        // e.g. "Backend Developer"
  expertise: string;   // context injected into agent system prompt
  model?: string;      // override from routing if set
}

export interface AgentHandle {
  agentId: string;
  sessionId: string;
}

export interface AgentResponse {
  agentId: string;
  content: string;
  round: number;
  timestamp: string;
}

export interface AgentExecutor {
  /**
   * Spawn an agent and give it the initial task.
   * Returns a handle for subsequent communication.
   */
  spawn(agent: AgentDefinition, task: string, context: string): Promise<AgentHandle>;

  /**
   * Send a follow-up message to an already-spawned agent.
   * Used for round 2+ in debates (inject other agents' proposals).
   */
  send(handle: AgentHandle, message: string): Promise<AgentResponse>;

  /** Clean up resources for this agent session. */
  terminate(handle: AgentHandle): Promise<void>;
}

export type ExecutorType = "claude-task" | "subprocess";

export function getExecutorType(): ExecutorType {
  const env = process.env["HMAF_EXECUTOR"] ?? "claude-task";
  return env === "subprocess" ? "subprocess" : "claude-task";
}
