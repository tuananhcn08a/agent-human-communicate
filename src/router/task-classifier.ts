import type { TaskCategory } from "./providers.js";

interface ClassificationSignal {
  keywords: string[];
  weight: number;
}

const SIGNALS: Record<TaskCategory, ClassificationSignal[]> = {
  architecture: [
    { keywords: ["adr", "architecture", "design pattern", "trade-off", "decision", "scalab"], weight: 3 },
    { keywords: ["diagram", "blueprint", "system", "infra", "database schema"], weight: 2 },
  ],
  research: [
    { keywords: ["research", "investigate", "compare", "evaluate", "spike", "explore", "find out"], weight: 3 },
    { keywords: ["what is", "how does", "why", "best practice", "alternative"], weight: 1 },
  ],
  planning: [
    { keywords: ["sprint", "backlog", "estimate", "breakdown", "user story", "task", "roadmap"], weight: 3 },
    { keywords: ["plan", "phase", "milestone", "priority", "scope"], weight: 2 },
  ],
  review: [
    { keywords: ["review", "code review", "pr", "pull request", "audit", "feedback", "check"], weight: 3 },
    { keywords: ["qa", "quality", "test coverage", "regression"], weight: 2 },
  ],
  "ios-code": [
    { keywords: ["swift", "swiftui", "xcode", "ios", "ipad", "macos", "uikit", "combine"], weight: 3 },
    { keywords: ["viewmodel", "stateobject", "observableobject", "view modifier"], weight: 2 },
  ],
  "backend-code": [
    { keywords: ["fastify", "node.js", "nodejs", "route", "endpoint", "api", "drizzle", "sqlite"], weight: 3 },
    { keywords: ["typescript", "zod schema", "jwt", "middleware", "handler"], weight: 1 },
  ],
  "web-code": [
    { keywords: ["react", "vite", "component", "tailwind", "shadcn", "hook", "jsx", "tsx"], weight: 3 },
    { keywords: ["frontend", "web", "ui", "browser", "page", "zustand", "tanstack"], weight: 2 },
  ],
  devops: [
    { keywords: ["docker", "cloudflare", "nginx", "synology", "nas", "ci/cd", "deploy"], weight: 3 },
    { keywords: ["dockerfile", "compose", "github actions", "pipeline", "build"], weight: 2 },
  ],
  "simple-fix": [
    { keywords: ["typo", "rename", "move file", "small fix", "one line", "quick"], weight: 3 },
    { keywords: ["lint error", "format", "cleanup", "trivial"], weight: 2 },
  ],
  unknown: [],
};

export function classifyTask(prompt: string): { category: TaskCategory; confidence: number } {
  const lower = prompt.toLowerCase();
  const scores: Partial<Record<TaskCategory, number>> = {};

  for (const [category, signals] of Object.entries(SIGNALS) as [TaskCategory, ClassificationSignal[]][]) {
    let score = 0;
    for (const signal of signals) {
      for (const kw of signal.keywords) {
        if (lower.includes(kw)) {
          score += signal.weight;
        }
      }
    }
    if (score > 0) scores[category] = score;
  }

  if (Object.keys(scores).length === 0) {
    return { category: "unknown", confidence: 0 };
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a) as [TaskCategory, number][];
  const [topCategory, topScore] = sorted[0]!;
  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);

  return {
    category: topCategory,
    confidence: Math.min(topScore / totalScore, 1),
  };
}
