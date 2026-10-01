import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { recipeInput, type RecipeInput } from "./recipe-input.ts";

const recipeSummary = "id,title,description,servings,prep_time_minutes,cook_time_minutes,tags";

export class PluginDataError extends Error {}

// This adapter uses a server-only database client. Every access is constrained
// by the verified subject; no tool accepts a user ID or household ID.
export function createPluginData(db: SupabaseClient, userId: string, origin: string, clientId?: string) {
  const recipeLink = (id: string) => `${origin}/recipes/${encodeURIComponent(id)}`;
  return {
    async saveRecipe(input: RecipeInput) {
      const recipe = recipeInput.parse(input);
      if (!clientId) throw new PluginDataError("Recipe saving is not enabled for this connection.");
      const permission = await db.from("marco_plugin_permissions").select("recipe_save_enabled").eq("user_id", userId).eq("client_id", clientId).maybeSingle();
      if (permission.error) throw new PluginDataError("Recipe-saving permission could not be checked. Nothing was saved.");
      if (!permission.data?.recipe_save_enabled) throw new PluginDataError(`Enable recipe saving for this connection at ${origin}/connect/recipe-saving?client_id=${encodeURIComponent(clientId)}, then retry. Nothing was saved.`);
      const key = createHash("sha256").update(JSON.stringify(recipe)).digest("hex");
      const existing = await db.from("recipes").select("id,title").eq("user_id", userId).eq("plugin_save_key", key).maybeSingle();
      if (existing.error) throw new PluginDataError("Recipe could not be checked. Nothing was saved.");
      if (existing.data) return { saved: true, already_saved: true, recipe: { ...existing.data, url: recipeLink(existing.data.id) } };
      const inserted = await db.from("recipes").insert({ ...recipe, user_id: userId, plugin_save_key: key }).select("id,title").single();
      if (inserted.error?.code === "23505") {
        const retry = await db.from("recipes").select("id,title").eq("user_id", userId).eq("plugin_save_key", key).maybeSingle();
        if (!retry.error && retry.data) return { saved: true, already_saved: true, recipe: { ...retry.data, url: recipeLink(retry.data.id) } };
      }
      if (inserted.error || !inserted.data) throw new PluginDataError("Recipe could not be saved. Retry the same recipe safely.");
      return { saved: true, already_saved: false, recipe: { ...inserted.data, url: recipeLink(inserted.data.id) } };
    },
    async searchRecipes(query: string, limit: number, offset: number) {
      const literal = query.replace(/[\\%_]/g, "\\$&");
      const { data, error } = await db.from("recipes").select(recipeSummary)
        .eq("user_id", userId).ilike("title", `%${literal}%`)
        .order("title").order("id").range(offset, offset + limit);
      if (error) throw new PluginDataError("Recipes could not be loaded. Try again shortly.");
      return { recipes: (data ?? []).slice(0, limit).map(r => ({ ...r, url: recipeLink(r.id) })),
        next_offset: (data?.length ?? 0) > limit ? offset + limit : null };
    },
    async getRecipe(id: string) {
      const { data, error } = await db.from("recipes")
        .select(`${recipeSummary},ingredients,steps,source_url`).eq("user_id", userId).eq("id", id).maybeSingle();
      if (error) throw new PluginDataError("Recipe could not be loaded. Try again shortly.");
      if (!data) throw new PluginDataError("Recipe not found in your saved recipes.");
      return { recipe: { ...data, url: recipeLink(data.id) } };
    },
    async getMealPlan(start: string, end: string) {
      const { data, error } = await db.from("meal_plans")
        .select("id,recipe_id,planned_date,meal_type,servings")
        .eq("user_id", userId).gte("planned_date", start).lte("planned_date", end)
        .order("planned_date").order("id").limit(501);
      if (error) throw new PluginDataError("Meal plan could not be loaded. Try again shortly.");
      // Do not join another owner's recipe using the admin client.
      const ids = [...new Set((data ?? []).map(p => p.recipe_id).filter(Boolean))];
      const recipes = ids.length ? await db.from("recipes").select("id,title")
        .eq("user_id", userId).in("id", ids) : { data: [], error: null };
      if (recipes.error) throw new PluginDataError("Meal plan recipes could not be loaded.");
      const titles = new Map((recipes.data ?? []).map(r => [r.id, r.title]));
      return { start_date: start, end_date: end, meals: (data ?? []).slice(0, 500).map(p => ({
        date: p.planned_date, meal_type: p.meal_type, servings: p.servings,
        recipe: titles.has(p.recipe_id) ? { id: p.recipe_id, title: titles.get(p.recipe_id), url: recipeLink(p.recipe_id) } : null,
      })), truncated: (data?.length ?? 0) > 500, url: `${origin}/meal-plan` };
    },
    async getPantry(limit: number, offset: number) {
      const { data, error } = await db.from("pantry_items").select("name,category,quantity")
        .eq("user_id", userId).order("name").order("id").range(offset, offset + limit);
      if (error) throw new PluginDataError("Pantry could not be loaded. Try again shortly.");
      return { items: (data ?? []).slice(0, limit), next_offset: (data?.length ?? 0) > limit ? offset + limit : null };
    },
    async getGroceryList(start: string) {
      const membership = await db.from("household_members").select("household_id").eq("user_id", userId).maybeSingle();
      if (membership.error) throw new PluginDataError("Household access could not be checked.");
      let owner = userId;
      if (membership.data) {
        const household = await db.from("households").select("created_by").eq("id", membership.data.household_id).maybeSingle();
        if (household.error || !household.data?.created_by) throw new PluginDataError("Household grocery list is unavailable.");
        owner = household.data.created_by;
      }
      const list = await db.from("grocery_lists").select("id,date_end").eq("user_id", owner).eq("week_start", start).maybeSingle();
      if (list.error) throw new PluginDataError("Grocery list could not be loaded.");
      if (!list.data) return { exists: false, items: [], message: "No saved grocery list for this start date. Generate one in Marco first." };
      const items = await db.from("grocery_items")
        .select("name,amount,unit,category,checked,in_pantry,name_override,amount_override,unit_override,category_override")
        .eq("list_id", list.data.id).eq("soft_deleted", false).order("category").order("name").order("id").limit(501);
      if (items.error) throw new PluginDataError("Grocery items could not be loaded.");
      return { exists: true, shared_household: !!membership.data, start_date: start, end_date: list.data.date_end,
        items: (items.data ?? []).slice(0, 500).map(i => ({
          name: i.name_override ?? i.name, amount: i.amount_override ?? i.amount,
          unit: i.unit_override ?? i.unit, category: i.category_override ?? i.category,
          checked: i.checked, in_pantry: i.in_pantry,
        })), truncated: (items.data?.length ?? 0) > 500, url: `${origin}/grocery` };
    },
  };
}
export type PluginData = ReturnType<typeof createPluginData>;
