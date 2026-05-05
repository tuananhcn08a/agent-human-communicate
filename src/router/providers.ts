import { z } from "zod";

export const TaskCategorySchema = z.enum([
  "architecture",   // ADR decisions, system design, trade-off analysis
  "research",       // Technology research, investigation, spiking
  "planning",       // Sprint planning, task breakdown, estimation
  "review",         // Code review, PR review, QA gate
  "ios-code",       // Swift / SwiftUI / Xcode implementation
  "backend-code",   // Node.js / Fastify / TypeScript API code
  "web-code",       // React / Vite / TypeScript frontend code
  "devops",         // Docker, Cloudflare, NAS, CI/CD scripts
  "simple-fix",     // Typo, trivial one-liner, rename
  "unknown",
]);

export type TaskCategory = z.infer<typeof TaskCategorySchema>;

export interface ModelProvider {
  id: string;
  name: string;
  model: string;
  baseUrl?: string;
  envKey: string;
  costPer1MInput: number;   // USD
  costPer1MOutput: number;  // USD
  strengths: TaskCategory[];
  maxTokens: number;
  supportsStreaming: boolean;
}

export const PROVIDERS: Record<string, ModelProvider> = {
  // Heavy reasoning — architecture + planning
  "claude-sonnet": {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.6",
    model: "claude-sonnet-4-6",
    envKey: "ANTHROPIC_API_KEY",
    costPer1MInput: 3.0,
    costPer1MOutput: 15.0,
    strengths: ["architecture", "research", "planning", "review"],
    maxTokens: 8192,
    supportsStreaming: true,
  },

  // Cost-optimised for iOS/Android code
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    costPer1MInput: 0.27,
    costPer1MOutput: 1.1,
    strengths: ["ios-code", "simple-fix"],
    maxTokens: 8192,
    supportsStreaming: true,
  },

  // Cost-optimised for Web/Backend code
  "qwen-plus": {
    id: "qwen-plus",
    name: "Qwen Plus",
    model: "qwen-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    envKey: "QWEN_API_KEY",
    costPer1MInput: 0.4,
    costPer1MOutput: 1.2,
    strengths: ["web-code", "backend-code", "devops"],
    maxTokens: 8192,
    supportsStreaming: true,
  },
} as const;

// Routing table: category → preferred provider id
export const ROUTING_TABLE: Record<TaskCategory, string> = {
  architecture:   "claude-sonnet",
  research:       "claude-sonnet",
  planning:       "claude-sonnet",
  review:         "claude-sonnet",
  "ios-code":     "deepseek-v3",
  "backend-code": "qwen-plus",
  "web-code":     "qwen-plus",
  devops:         "qwen-plus",
  "simple-fix":   "deepseek-v3",
  unknown:        "claude-sonnet",  // safe default
};
