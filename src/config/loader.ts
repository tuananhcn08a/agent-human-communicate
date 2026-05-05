/**
 * Config loader — reads .hmaf/config.json from the project root.
 * Falls back to built-in defaults if no config exists.
 * Projects using HMAF define their own config via `npx hmaf init`.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const ProviderConfigSchema = z.object({
  model: z.string(),
  baseUrl: z.string().optional(),
  envKey: z.string(),
  costPer1MInput: z.number().default(3.0),
  costPer1MOutput: z.number().default(15.0),
});

const HmafConfigSchema = z.object({
  project: z.string().default("unnamed"),
  version: z.string().default("0.1.0"),
  modules: z.object({
    voice: z.boolean().default(false),
    teams: z.boolean().default(false),
    router: z.boolean().default(false),
  }).default({}),
  sessionPrompt: z.boolean().default(true),
  routing: z.record(z.string()).default({
    architecture:   "claude-sonnet",
    research:       "claude-sonnet",
    planning:       "claude-sonnet",
    review:         "claude-sonnet",
    "ios-code":     "claude-sonnet",
    "backend-code": "claude-sonnet",
    "web-code":     "claude-sonnet",
    devops:         "claude-sonnet",
    "simple-fix":   "claude-sonnet",
    unknown:        "claude-sonnet",
  }),
  providers: z.record(ProviderConfigSchema).default({
    "claude-sonnet": {
      model: "claude-sonnet-4-6",
      envKey: "ANTHROPIC_API_KEY",
      costPer1MInput: 3.0,
      costPer1MOutput: 15.0,
    },
  }),
  teams: z.object({
    debateRounds: z.number().default(2),
    pauseBetweenRounds: z.boolean().default(true),
    outputDir: z.string().default("docs/03-session-state/team-debates"),
  }).default({}),
  gate: z.object({
    mode: z.enum(["smart", "strict", "auto"]).default("smart"),
  }).default({}),
  voice: z.object({
    sttProvider: z.string().default("soniox"),
    ttsProvider: z.enum(["macos", "openai"]).default("macos"),
    language: z.string().default("vi"),
  }).default({}),
});

export type HmafConfig = z.infer<typeof HmafConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

let _cached: HmafConfig | null = null;

export function loadConfig(projectRoot?: string): HmafConfig {
  if (_cached) return _cached;

  const root = projectRoot ?? process.cwd();
  const configPath = join(root, ".hmaf", "config.json");

  if (!existsSync(configPath)) {
    _cached = HmafConfigSchema.parse({});
    return _cached;
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8"));
    _cached = HmafConfigSchema.parse(raw);
    return _cached;
  } catch (err) {
    console.error(`[hmaf] Invalid .hmaf/config.json: ${err instanceof Error ? err.message : err}`);
    _cached = HmafConfigSchema.parse({});
    return _cached;
  }
}

export function getProvider(config: HmafConfig, providerId: string): ProviderConfig | undefined {
  return config.providers[providerId];
}

export function getRoutedProvider(config: HmafConfig, category: string): ProviderConfig {
  const providerId = config.routing[category] ?? config.routing["unknown"] ?? "claude-sonnet";
  return config.providers[providerId] ?? config.providers["claude-sonnet"] ?? {
    model: "claude-sonnet-4-6",
    envKey: "ANTHROPIC_API_KEY",
    costPer1MInput: 3.0,
    costPer1MOutput: 15.0,
  };
}
