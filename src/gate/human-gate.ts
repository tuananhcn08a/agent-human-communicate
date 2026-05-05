/**
 * Human-in-the-loop gate — inspired by ClaudeKit's hard gate mechanism.
 *
 * Philosophy (inherited from CLAUDE.md):
 *   - Only block on decisions the agent genuinely cannot make alone
 *   - NEVER ask for trivial confirmations
 *   - Gate triggers: UX changes, architecture decisions, cross-stack impacts
 *
 * In voice sessions: gate speaks the question and waits for spoken reply.
 * In text sessions: gate prints and waits for stdin.
 */

import { createInterface } from "node:readline";

export type GateMode = "smart" | "strict" | "auto";

export interface GateDecision {
  approved: boolean;
  feedback?: string;
}

// Patterns that ALWAYS require human approval (regardless of mode)
const HARD_GATE_PATTERNS: RegExp[] = [
  /architecture decision|adr/i,
  /delete|drop table|remove column/i,
  /production deploy|force push|reset.{0,20}main/i,
  /ui.{0,30}major change|redesign|ux overhaul/i,
  /pricing|billing|payment/i,
  /privacy|gdpr|personal data/i,
];

// Patterns that trigger gates in "strict" mode only
const SOFT_GATE_PATTERNS: RegExp[] = [
  /new (component|screen|page)/i,
  /change (color|font|layout|style)/i,
  /refactor|rename/i,
  /add dependency|install package/i,
];

function getMode(): GateMode {
  const env = process.env["HMAF_GATE_MODE"] ?? "smart";
  if (env === "auto" || env === "strict") return env;
  return "smart";
}

export function shouldGate(action: string): boolean {
  const mode = getMode();

  if (mode === "auto") return false;

  if (HARD_GATE_PATTERNS.some((p) => p.test(action))) return true;

  if (mode === "strict" && SOFT_GATE_PATTERNS.some((p) => p.test(action))) return true;

  return false;
}

export async function gate(
  question: string,
  context?: string,
): Promise<GateDecision> {
  const mode = getMode();

  if (mode === "auto") {
    return { approved: true };
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    const prompt = context
      ? `\n[GATE] ${context}\n→ ${question}\nApprove? (y/n/feedback): `
      : `\n[GATE] ${question}\nApprove? (y/n/feedback): `;

    rl.question(prompt, (answer) => {
      rl.close();
      const lower = answer.trim().toLowerCase();

      if (lower === "y" || lower === "yes" || lower === "") {
        resolve({ approved: true });
      } else if (lower === "n" || lower === "no") {
        resolve({ approved: false });
      } else {
        // Treat non-yes/no as feedback + approved
        resolve({ approved: true, feedback: answer.trim() });
      }
    });
  });
}
