/**
 * Dynamic Model Router — routes code tasks to cheaper providers (Gemini, etc.)
 *
 * Design reality:
 *   - Architecture/planning/review tasks → handled by Claude Code directly (subscription)
 *   - Code tasks (ios, backend, web, simple-fix) → routed here to Gemini
 *
 * ANTHROPIC_API_KEY is NOT required. Router only needs keys for
 * providers configured in .hmaf/config.json (e.g. GEMINI_API_KEY).
 * If a provider key is missing, the task is skipped with a clear message.
 */

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
  skipped?: boolean;   // true when no API key available — use Claude Code directly
  skipReason?: string;
}

function openaiCompatClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
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
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: prompt },
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

  const providerId = config.routing[category] ?? "unknown";
  const provider = getRoutedProvider(config, category);
  const apiKey = process.env[provider.envKey] ?? "";

  // No API key → skip, user handles in Claude Code directly
  if (!apiKey) {
    const msg = `[router] ${category} → no key for '${providerId}' (${provider.envKey} not set) — handle in Claude Code`;
    if ((process.env["HMAF_LOG_LEVEL"] ?? "info") !== "silent") console.log(msg);

    return {
      content: "",
      providerId,
      model: provider.model,
      category,
      confidence,
      tokensUsed: { input: 0, output: 0 },
      estimatedCostUSD: 0,
      skipped: true,
      skipReason: `${provider.envKey} not set`,
    };
  }

  if (!provider.baseUrl) {
    return {
      content: "",
      providerId,
      model: provider.model,
      category,
      confidence,
      tokensUsed: { input: 0, output: 0 },
      estimatedCostUSD: 0,
      skipped: true,
      skipReason: `Provider '${providerId}' has no baseUrl — only OpenAI-compatible providers supported`,
    };
  }

  const client = openaiCompatClient(provider.baseUrl, apiKey);
  const result = await callOpenAICompat(client, provider.model, systemPrompt, prompt, maxTokens);

  const estimatedCostUSD =
    (result.inputTokens / 1_000_000) * provider.costPer1MInput +
    (result.outputTokens / 1_000_000) * provider.costPer1MOutput;

  if ((process.env["HMAF_LOG_LEVEL"] ?? "info") !== "silent") {
    console.log(
      `[router] ${category} (${(confidence * 100).toFixed(0)}%) → ${providerId} (${provider.model}) ~$${estimatedCostUSD.toFixed(5)}`,
    );
  }

  return {
    content: result.content,
    providerId,
    model: provider.model,
    category,
    confidence,
    tokensUsed: { input: result.inputTokens, output: result.outputTokens },
    estimatedCostUSD,
  };
}

// CLI: npm run route "your task"
if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.error("Usage: npm run route \"<task description>\"");
    process.exit(1);
  }

  route({ prompt, maxTokens: 2048, stream: false })
    .then((r) => {
      if (r.skipped) {
        console.log(`\n[skipped] ${r.skipReason}`);
        console.log("→ Handle this task directly in Claude Code.");
        return;
      }
      console.log("\n--- Response ---\n" + r.content);
      console.log(`\n[cost] $${r.estimatedCostUSD.toFixed(5)} | in=${r.tokensUsed.input} out=${r.tokensUsed.output}`);
    })
    .catch(console.error);
}
