/**
 * Dynamic Model Router — routes tasks to the cheapest capable provider.
 *
 * Provider config and routing table come from .hmaf/config.json,
 * making this fully project-agnostic.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { classifyTask } from "./task-classifier.js";
import { loadConfig, getRoutedProvider } from "../config/loader.js";
import type { TaskCategory } from "./providers.js";

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
  providerId: string;
  model: string;
  category: TaskCategory;
  confidence: number;
  tokensUsed: { input: number; output: number };
  estimatedCostUSD: number;
}

const anthropicClient = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"] ?? "",
});

function openaiCompatClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
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

  return { content, inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens };
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

  return {
    content: resp.choices[0]?.message.content ?? "",
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
  };
}

export async function route(request: RouteRequest): Promise<RouteResult> {
  const { prompt, systemPrompt = "", maxTokens, forceCategory } = RouteRequestSchema.parse(request);
  const config = loadConfig();

  const { category, confidence } = forceCategory
    ? { category: forceCategory as TaskCategory, confidence: 1 }
    : classifyTask(prompt);

  const provider = getRoutedProvider(config, category);
  const apiKey = process.env[provider.envKey] ?? "";

  // Fallback to claude-sonnet if target provider has no key
  const useProvider = apiKey
    ? provider
    : (config.providers["claude-sonnet"] ?? provider);
  const resolvedKey = (apiKey || process.env["ANTHROPIC_API_KEY"]) ?? "";
  const providerId = apiKey ? (config.routing[category] ?? "claude-sonnet") : "claude-sonnet";

  let result: { content: string; inputTokens: number; outputTokens: number };

  if (!useProvider.baseUrl) {
    result = await callAnthropic(useProvider.model, systemPrompt, prompt, maxTokens);
  } else {
    const client = openaiCompatClient(useProvider.baseUrl, resolvedKey);
    result = await callOpenAICompat(client, useProvider.model, systemPrompt, prompt, maxTokens);
  }

  const estimatedCostUSD =
    (result.inputTokens / 1_000_000) * useProvider.costPer1MInput +
    (result.outputTokens / 1_000_000) * useProvider.costPer1MOutput;

  if ((process.env["HMAF_LOG_LEVEL"] ?? "info") !== "silent") {
    console.log(
      `[router] ${category} (${(confidence * 100).toFixed(0)}%) → ${providerId} (${useProvider.model}) ~$${estimatedCostUSD.toFixed(5)}`,
    );
  }

  return {
    content: result.content,
    providerId,
    model: useProvider.model,
    category,
    confidence,
    tokensUsed: { input: result.inputTokens, output: result.outputTokens },
    estimatedCostUSD,
  };
}

// CLI: tsx src/router/model-router.ts "your prompt"
if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) { console.error("Usage: tsx src/router/model-router.ts <prompt>"); process.exit(1); }

  route({ prompt, maxTokens: 2048, stream: false })
    .then((r) => {
      console.log("\n--- Response ---\n" + r.content);
      console.log(`\n[cost] $${r.estimatedCostUSD.toFixed(5)} | in=${r.tokensUsed.input} out=${r.tokensUsed.output}`);
    })
    .catch(console.error);
}
