#!/usr/bin/env node
/**
 * agent-runner — spawned as a subprocess by SubprocessExecutor.
 * Reads RunnerInput from stdin, calls OpenAI-compat API, writes response to file.
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import OpenAI from "openai";
import { loadConfig } from "../config/loader.js";

interface RunnerInput {
  agentId: string;
  role: string;
  expertise: string;
  providerId: string;
  task: string;
  context: string;
  round: number;
  outputFile: string;
}

async function main() {
  const input: RunnerInput = JSON.parse(await readStdin());
  const config = loadConfig();
  const provider = config.providers[input.providerId];

  if (!provider) throw new Error(`Unknown provider: ${input.providerId}`);
  if (!provider.baseUrl) throw new Error(`Provider '${input.providerId}' has no baseUrl — only OpenAI-compatible providers supported in subprocess mode`);

  const apiKey = process.env[provider.envKey] ?? "";
  if (!apiKey) throw new Error(`Missing env var: ${provider.envKey}`);

  const client = new OpenAI({ baseURL: provider.baseUrl, apiKey });

  const systemPrompt = `You are ${input.role} with expertise in: ${input.expertise}.
Analyze the problem from your perspective. Be concise (≤300 words).
Respond in the same language as the task (Vietnamese or English).`;

  const userMessage = input.round === 1
    ? `## Context\n${input.context}\n\n## Task\n${input.task}\n\nProvide your analysis and recommendation.`
    : input.task;  // For round 2+, task already contains all proposals to rebut

  const resp = await client.chat.completions.create({
    model: provider.model,
    max_tokens: 600,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = resp.choices[0]?.message.content ?? "[no response]";
  const output = `# ${input.role} — Round ${input.round}\n## Đề xuất\n${content}\n`;

  mkdirSync(dirname(input.outputFile), { recursive: true });
  writeFileSync(input.outputFile, output, "utf8");
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

main().catch((err) => {
  console.error("[agent-runner]", err instanceof Error ? err.message : err);
  process.exit(1);
});
