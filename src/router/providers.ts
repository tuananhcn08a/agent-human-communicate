import { z } from "zod";

export const TaskCategorySchema = z.enum([
  "architecture",
  "research",
  "planning",
  "review",
  "ios-code",
  "backend-code",
  "web-code",
  "devops",
  "simple-fix",
  "unknown",
]);

export type TaskCategory = z.infer<typeof TaskCategorySchema>;
