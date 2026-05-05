/**
 * Dynamic Model Router — routes tasks to the cheapest capable provider.
 *
 * Decision logic:
 *   1. Classify task category from prompt keywords
 *   2. Look up preferred provider from ROUTING_TABLE
 *   3. Verify provider's API key is available; fallback to claude-sonnet
 *   4. Execute, track token usage & cost
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { classifyTask } from "./task-classifier.js";
import { PROVIDERS, ROUTING_TABLE, type TaskCategory } from "./providers.js";

const RouteRequestSchema = z.object({
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  forceCategory: z.string().optional(),
  maxTokens: z.number().default(4096),
  stream: z.boolean().default(false),
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export interface RouteResult {
  content: string;
  provider: string;
  model: string;
  category: TaskCategory;
  confidence: number;
  tokensUsed: { input: number; output: number };
  estimatedCostUSD: number;
}

const anthropicClient = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"] ?? "",
});

function buildOpenAICompatClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
}

function getApiKey(envKey: string): string | undefined {
  return process.env[envKey];
}

async function callAnthropic(
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const resp = await anthropicClient.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const content = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return {
    content,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
  };
}

async function callOpenAICompat(
  client: OpenAI,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  const choice = resp.choices[0];
  return {
    content: choice?.message.content ?? "",
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
  };
}

export async function route(request: RouteRequest): Promise<RouteResult> {
  const { prompt, systemPrompt = "", maxTokens, forceCategory } = RouteRequestSchema.parse(request);

  const { category, confidence } = forceCategory
    ? { category: forceCategory as TaskCategory, confidence: 1 }
    : classifyTask(prompt);

  const preferredProviderId = ROUTING_TABLE[category];
  const preferredProvider = PROVIDERS[preferredProviderId];

  // Fallback to claude-sonnet if provider key is missing
  const apiKey = getApiKey(preferredProvider?.envKey ?? "");
  const provider = apiKey && preferredProvider ? preferredProvider : PROVIDERS["claude-sonnet"]!;
  const resolvedApiKey = apiKey ?? getApiKey(provider.envKey) ?? "";

  let result: { content: string; inputTokens: number; outputTokens: number };

  if (provider.id === "claude-sonnet") {
    result = await callAnthropic(provider.model, systemPrompt, prompt, maxTokens);
  } else {
    const client = buildOpenAICompatClient(provider.baseUrl!, resolvedApiKey);
    result = await callOpenAICompat(client, provider.model, systemPrompt, prompt, maxTokens);
  }

  const estimatedCostUSD =
    (result.inputTokens / 1_000_000) * provider.costPer1MInput +
    (result.outputTokens / 1_000_000) * provider.costPer1MOutput;

  logRoute({ category, confidence, provider: provider.id, model: provider.model, estimatedCostUSD });

  return {
    content: result.content,
    provider: provider.id,
    model: provider.model,
    category,
    confidence,
    tokensUsed: { input: result.inputTokens, output: result.outputTokens },
    estimatedCostUSD,
  };
}

function logRoute(info: {
  category: TaskCategory;
  confidence: number;
  provider: string;
  model: string;
  estimatedCostUSD: number;
}) {
  const logLevel = process.env["HMAF_LOG_LEVEL"] ?? "info";
  if (logLevel === "silent") return;
  console.log(
    `[router] category=${info.category} confidence=${(info.confidence * 100).toFixed(0)}% ` +
      `→ ${info.provider} (${info.model}) ~$${info.estimatedCostUSD.toFixed(5)}`,
  );
}

// CLI usage: tsx src/router/model-router.ts "your prompt here"
if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.error("Usage: tsx src/router/model-router.ts <prompt>");
    process.exit(1);
  }

  route({ prompt, maxTokens: 2048, stream: false }).then((result) => {
    console.log("\n--- Response ---");
    console.log(result.content);
    console.log(`\n[cost] $${result.estimatedCostUSD.toFixed(5)} | tokens in=${result.tokensUsed.input} out=${result.tokensUsed.output}`);
  }).catch(console.error);
}
