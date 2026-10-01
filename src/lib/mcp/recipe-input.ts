import { z } from "zod";

export const recipeInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  ingredients: z.array(z.object({ name: z.string().trim().min(1).max(200), amount: z.string().trim().max(80).default(""), unit: z.string().trim().max(80).default("") }).strict()).min(1).max(100),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(60),
  servings: z.number().int().min(1).max(100).nullable().default(null),
  prep_time_minutes: z.number().int().min(0).max(10080).nullable().default(null),
  cook_time_minutes: z.number().int().min(0).max(10080).nullable().default(null),
  source_url: z.string().url().max(2048).refine(s => { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; }, "Use a public HTTPS source URL without credentials.").nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
}).strict();
export type RecipeInput = z.infer<typeof recipeInput>;
