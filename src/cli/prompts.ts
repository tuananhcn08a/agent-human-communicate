/**
 * Minimal readline-based prompt helpers — no external deps.
 */

import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });

export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

export async function askDefault(question: string, defaultVal: string): Promise<string> {
  const answer = await ask(`${question} (default: ${defaultVal}): `);
  return answer || defaultVal;
}

/** Multi-select: present numbered options, user types "1 3 4" or "all" */
export async function multiSelect<T extends string>(
  question: string,
  options: { value: T; label: string }[],
): Promise<T[]> {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  [${i + 1}] ${o.label}`));
  console.log(`  [a] Tất cả`);

  const answer = await ask("Chọn (VD: 1 3 hoặc a): ");

  if (answer.toLowerCase() === "a" || answer.toLowerCase() === "all") {
    return options.map((o) => o.value);
  }

  const indices = answer.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= options.length);
  return indices.map((i) => options[i - 1]!.value);
}

export function close(): void {
  rl.close();
}

export function banner(text: string): void {
  const line = "═".repeat(text.length + 4);
  console.log(`\n╔${line}╗`);
  console.log(`║  ${text}  ║`);
  console.log(`╚${line}╝\n`);
}
