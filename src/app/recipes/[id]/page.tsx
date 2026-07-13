"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import useSWR, { mutate as swrMutate } from "swr";
import dynamic from "next/dynamic";
import type { Recipe, Ingredient } from "@/types";
import { useRecipe, useRecipes, apiFetcher } from "@/lib/hooks/use-data";
import { findDietaryConflicts } from "@/lib/cook/dietary";
import IMadeThisButton from "@/components/gamification/IMadeThisButton";
import MyNotesCard from "@/components/recipes/MyNotesCard";
import RecipeRating from "@/components/recipes/RecipeRating";
import { useToast } from "@/components/ui/Toast";
import { MealTypeIcon } from "@/components/icons/MealIcons";

/* ── Accordion wrapper ──────────────────────────────────────────────── */
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {title}
        <svg
          className={`w-4 h-4 text-[#a09890] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── Lazy-load heavy/conditional components ──────────────────────────────────
const RecipeForm = dynamic(() => import("@/components/recipes/RecipeForm"), { ssr: false });
const AddToCollectionModal = dynamic(() => import("@/components/collections/AddToCollectionModal"), { ssr: false });
const ShareWithFriendsModal = dynamic(() => import("@/components/friends/ShareWithFriendsModal"), { ssr: false });
const AddMealSheet = dynamic(() => import("@/components/meal-plan/AddMealSheet"), { ssr: false });
const CommunitySection = dynamic(() => import("@/components/community/CommunitySection"));
const CookPhotosGallery = dynamic(() => import("@/components/recipes/CookPhotosGallery"));
// CookWithMarcoChat is deliberately quarantined — its substitution / technique-
// question logic comes back as voice features inside Cook mode in Phase 2.
// Until then the recipe-detail "Cook with marco" button opens CookMode instead.
const CookMode = dynamic(() => import("@/components/recipes/CookMode"), { ssr: false });
const SubstitutionSheet = dynamic(() => import("@/components/recipes/SubstitutionSheet"), { ssr: false });


/* ── Standing substitution preferences (Phase 2) ─────────────────────── */
interface StandingSub {
  id: string;
  from_name: string;
  to_name: string;
  to_amount: string | null;
  to_unit: string | null;
  ratio_note: string | null;
  reasoning: string | null;
}

/** Match an ingredient against the user's standing prefs. Same case-insensitive
 *  substring approach the voice "how much" lookup uses, so prefs apply
 *  consistently across surfaces. */
function findStandingSub(ingredientName: string, subs: StandingSub[]): StandingSub | null {
  const norm = (ingredientName || "").toLowerCase().trim();
  if (!norm) return null;
  const matches = subs
    .map((s) => ({ s, key: s.from_name.toLowerCase().trim() }))
    .filter((m) => norm.includes(m.key) || m.key.includes(norm))
    .sort((a, b) => b.key.length - a.key.length);
  return matches[0]?.s ?? null;
}


/* ── Unit conversion maps ────────────────────────────────────────────── */
type UnitSystem = "imperial" | "metric";

interface Conversion {
  unit: string;
  factor: number;
}

const toMetric: Record<string, Conversion> = {
  cup: { unit: "ml", factor: 236.588 },
  cups: { unit: "ml", factor: 236.588 },
  tbsp: { unit: "ml", factor: 14.787 },
  tablespoon: { unit: "ml", factor: 14.787 },
  tablespoons: { unit: "ml", factor: 14.787 },
  tsp: { unit: "ml", factor: 4.929 },
  teaspoon: { unit: "ml", factor: 4.929 },
  teaspoons: { unit: "ml", factor: 4.929 },
  oz: { unit: "g", factor: 28.3495 },
  ounce: { unit: "g", factor: 28.3495 },
  ounces: { unit: "g", factor: 28.3495 },
  lb: { unit: "g", factor: 453.592 },
  lbs: { unit: "g", factor: 453.592 },
  pound: { unit: "g", factor: 453.592 },
  pounds: { unit: "g", factor: 453.592 },
  "fl oz": { unit: "ml", factor: 29.5735 },
  quart: { unit: "ml", factor: 946.353 },
  quarts: { unit: "ml", factor: 946.353 },
  gallon: { unit: "L", factor: 3.78541 },
  gallons: { unit: "L", factor: 3.78541 },
  pint: { unit: "ml", factor: 473.176 },
  pints: { unit: "ml", factor: 473.176 },
  inch: { unit: "cm", factor: 2.54 },
  inches: { unit: "cm", factor: 2.54 },
  "°F": { unit: "°C", factor: 0 }, // special handling
  "°f": { unit: "°C", factor: 0 },
};

const toImperial: Record<string, Conversion> = {
  ml: { unit: "tsp", factor: 0.202884 },
  milliliter: { unit: "tsp", factor: 0.202884 },
  milliliters: { unit: "tsp", factor: 0.202884 },
  l: { unit: "cups", factor: 4.22675 },
  liter: { unit: "cups", factor: 4.22675 },
  liters: { unit: "cups", factor: 4.22675 },
  g: { unit: "oz", factor: 0.035274 },
  gram: { unit: "oz", factor: 0.035274 },
  grams: { unit: "oz", factor: 0.035274 },
  kg: { unit: "lbs", factor: 2.20462 },
  kilogram: { unit: "lbs", factor: 2.20462 },
  kilograms: { unit: "lbs", factor: 2.20462 },
  cm: { unit: "inches", factor: 0.393701 },
  centimeter: { unit: "inches", factor: 0.393701 },
  centimeters: { unit: "inches", factor: 0.393701 },
  "°C": { unit: "°F", factor: 0 }, // special handling
  "°c": { unit: "°F", factor: 0 },
};

/** Smart metric display: promote ml→L for large values, g→kg for large values */
function smartMetricUnit(value: number, unit: string): { value: number; unit: string } {
  if (unit === "ml" && value >= 1000) return { value: value / 1000, unit: "L" };
  if (unit === "g" && value >= 1000) return { value: value / 1000, unit: "kg" };
  return { value, unit };
}

/** Smart imperial display: promote tsp→tbsp→cup, oz→lbs */
function smartImperialUnit(value: number, unit: string): { value: number; unit: string } {
  if (unit === "tsp" && value >= 3) return { value: value / 3, unit: "tbsp" };
  if (unit === "tbsp" && value >= 16) return { value: value / 16, unit: "cups" };
  if (unit === "oz" && value >= 16) return { value: value / 16, unit: "lbs" };
  return { value, unit };
}

function convertUnit(amount: number, unit: string, targetSystem: UnitSystem): { amount: number; unit: string } | null {
  const lowerUnit = unit.toLowerCase().trim();

  // Temperature special case
  if (lowerUnit === "°f" && targetSystem === "metric") {
    return { amount: (amount - 32) * 5 / 9, unit: "°C" };
  }
  if (lowerUnit === "°c" && targetSystem === "imperial") {
    return { amount: amount * 9 / 5 + 32, unit: "°F" };
  }

  const map = targetSystem === "metric" ? toMetric : toImperial;
  const conv = map[lowerUnit] || map[unit];
  if (!conv) return null;

  let converted = amount * conv.factor;
  let newUnit = conv.unit;

  // Smart unit promotion
  if (targetSystem === "metric") {
    const smart = smartMetricUnit(converted, newUnit);
    converted = smart.value;
    newUnit = smart.unit;
  } else {
    const smart = smartImperialUnit(converted, newUnit);
    converted = smart.value;
    newUnit = smart.unit;
  }

  return { amount: converted, unit: newUnit };
}


/** Parse a string amount (e.g. "1/2", "1.5", "2") into a number, scale it, and format nicely. */
function scaleAmount(raw: string | undefined, ratio: number): string {
  if (!raw) return "";
  // Try to parse as a fraction like "1/2" or mixed like "1 1/2"
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let value: number | null = null;

  // Mixed fraction: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    value = parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Simple fraction: "1/2"
  if (value === null) {
    const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
    if (fracMatch) {
      value = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
    }
  }

  // Decimal or integer
  if (value === null) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) value = num;
  }

  // Can't parse — return original
  if (value === null) return trimmed;

  const scaled = value * ratio;

  // Format: use fractions for common values, otherwise round to 1 decimal
  return formatAmount(scaled);
}

function formatAmount(n: number): string {
  // Round to avoid floating point noise
  const rounded = Math.round(n * 100) / 100;

  // Common fractions
  const fractions: [number, string][] = [
    [0.125, "1/8"], [0.25, "1/4"], [0.333, "1/3"], [0.5, "1/2"],
    [0.667, "2/3"], [0.75, "3/4"],
  ];

  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  // Check if the fractional part matches a common fraction
  for (const [val, str] of fractions) {
    if (Math.abs(frac - val) < 0.04) {
      return whole > 0 ? `${whole} ${str}` : str;
    }
  }

  // Whole number
  if (Math.abs(frac) < 0.04) return `${whole}`;

  // Decimal — one place max
  return rounded % 1 === 0 ? `${rounded}` : `${Math.round(rounded * 10) / 10}`;
}

/* ── Tag chip with a contextual icon ─────────────────────────────────── */
function tagIconPath(tag: string): string {
  const t = tag.toLowerCase();
  if (/one[\s-]?pot|pot|skillet|pan/.test(t)) return "M4 8h16v3a8 8 0 01-16 0V8zM2 8h20M8 4c0-1 1-1.5 1-2.5M12 4c0-1 1-1.5 1-2.5";
  if (/veg|plant|green|salad/.test(t)) return "M11 20A7 7 0 014 13c0-5 4-9 9-9 5 0 7 3 7 3-2 9-9 13-9 13zM11 20c0-4 2-7 5-9";
  if (/quick|easy|fast|15|min|weeknight/.test(t)) return "M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z";
  if (/cream|cheese|rich|butter/.test(t)) return "M12 3c3 4 5 6.5 5 9a5 5 0 01-10 0c0-2.5 2-5 5-9z";
  if (/lemon|lime|citrus|tang|sour/.test(t)) return "M5 12a7 7 0 0114 0 7 7 0 01-14 0zM12 5v14";
  if (/summer|sun|bright|fresh/.test(t)) return "M12 4a8 8 0 100 16 8 8 0 000-16zM12 2v0M12 22v0M2 12h0M22 12h0";
  if (/pasta|noodle|carb|grain|rice|bread/.test(t)) return "M5 7c3-2 11-2 14 0M5 12c3-2 11-2 14 0M5 17c3-2 11-2 14 0";
  if (/spic|chili|hot|pepper/.test(t)) return "M12 3c2 3 4 5 4 9a4 4 0 01-8 0c0-4 2-6 4-9z";
  if (/sweet|dessert|cake|choc/.test(t)) return "M6 11h12l-1.5 9h-9L6 11zM8 11a4 4 0 018 0";
  return "M7 7h.01M7 3h5a2 2 0 011.4.6l7 7a2 2 0 010 2.8l-5 5a2 2 0 01-2.8 0l-7-7A2 2 0 015 12V7a4 4 0 014-4z";
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium" style={{ background: "#F2EEE6", color: "var(--ink, #1C1A17)" }}>
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d={tagIconPath(tag)} />
      </svg>
      {tag}
    </span>
  );
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showShareWithFriends, setShowShareWithFriends] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const servingsParam = searchParams ? parseInt(searchParams.get("servings") ?? "", 10) : NaN;
  const [adjustedServings, setAdjustedServings] = useState<number | null>(
    !isNaN(servingsParam) && servingsParam > 0 ? servingsParam : null
  );
  const [showMealPlanPrompt, setShowMealPlanPrompt] = useState(false);
  const [showAddMealSheet, setShowAddMealSheet] = useState(false);
  const [unitSystem, setUnitSystem] = useState<UnitSystem | null>(null); // null = original
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const [showMarcoChat, setShowMarcoChat] = useState(false);
  const [substituteIngredient, setSubstituteIngredient] = useState<Ingredient | null>(null);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showRatingSheet, setShowRatingSheet] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const cameraFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  // Auto-open AddMealSheet if directed from save toast
  useEffect(() => {
    if (searchParams?.get("openMealSheet") === "true") {
      setShowAddMealSheet(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SWR data ────────────────────────────────────────────────────────────────
  const { data: recipeData, isLoading: loading, mutate: mutateRecipe } = useRecipe(id as string);
  const recipe = recipeData ?? null;
  const isPublicView = Boolean((recipe as { is_public_view?: boolean } | null)?.is_public_view);
  const { data: allRecipesData = [] } = useRecipes();
  const { data: savedRecipesData = [] } = useRecipes();

  // Standing substitution preferences — applied silently when rendering
  // ingredients. The ↳ marker is the only visible affordance; tap to revert.
  const { data: standingSubsData, mutate: mutateStandingSubs } = useSWR<{ subs: StandingSub[] }>(
    "/api/user/standing-subs",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );
  const standingSubs: StandingSub[] = standingSubsData?.subs ?? [];

  // Dietary filters — keyword-detected against the *effective* (post-standing-
  // sub) ingredient name. A small "needs swap" pill flags conflicts so the
  // user knows to tap and pick a substitute.
  const { data: dietaryData } = useSWR<{ filters: string[] }>(
    "/api/user/dietary",
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  const dietaryFilters: string[] = dietaryData?.filters ?? [];

  // When viewing someone else's copy of a recipe we already own, find that
  // saved row so we can redirect to it instead of stranding the user on the
  // public-view dead end.
  const savedCopy = useMemo<Recipe | null>(() => {
    if (!isPublicView || !recipe || !Array.isArray(savedRecipesData)) return null;
    const list = savedRecipesData as Recipe[];
    const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
    if (recipe.source_url) {
      const m = list.find((r) => r.source_url === recipe.source_url);
      if (m) return m;
    }
    if (recipe.image_url) {
      const m = list.find(
        (r) => norm(r.title) === norm(recipe.title) && r.image_url === recipe.image_url,
      );
      if (m) return m;
    }
    return list.find((r) => norm(r.title) === norm(recipe.title)) ?? null;
  }, [isPublicView, recipe, savedRecipesData]);
  const alreadySaved = !!savedCopy;

  // Auto-redirect to the user's own copy when they hit a public URL for a
  // recipe they've already saved — keeps Edit/Notes/Add to Meal Plan etc.
  // available instead of the disabled "Already in your library" chip.
  useEffect(() => {
    if (isPublicView && savedCopy) {
      router.replace(`/recipes/${savedCopy.id}`);
    }
  }, [isPublicView, savedCopy, router]);
  const [savingPublic, setSavingPublic] = useState(false);

  // Compute current week start (Monday) and today's date for AddMealSheet
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekStart = (() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const { data: collectionsData, mutate: mutateCollections } = useSWR(
    id && !isPublicView ? `/api/recipes/${id}/collections` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );
  const recipeCollections: { id: string; name: string }[] = isPublicView ? [] : (collectionsData?.collections ?? []);

  // Community rating — shared by the inline header display + the Reviews card.
  const { data: ratingData } = useSWR<{ average: number; count: number; userRating: number | null }>(
    id ? `/api/recipes/${id}/rating` : null,
    apiFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );
  const ratingAvg = ratingData?.average ?? 0;
  const ratingCount = ratingData?.count ?? 0;

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);

    swrMutate(
      "supabase:recipes",
      (current: Recipe[] | undefined) => (current ?? []).filter((r) => r.id !== id),
      false,
    );
    router.push("/recipes");

    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", id);
    if (deleteError) {
      swrMutate("supabase:recipes");
      showToast("Failed to delete recipe");
    }
  }

  async function handleMealSheetAdd(recipeId: string, dates: string[], mealType: string, servings?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rows = dates.map((planned_date) => ({
      user_id: user.id,
      recipe_id: recipeId,
      planned_date,
      meal_type: mealType,
      ...(servings ? { servings } : {}),
    }));

    const { error: insertError } = await supabase.from("meal_plans").insert(rows);
    if (insertError) return;
    // Sheet handles toast + closing via AddMealSheet
  }

  /** Camera button: create cooking log if needed, upload photo, save to log */
  async function handleCameraFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB");
      return;
    }

    setCameraUploading(true);
    try {
      // 1. Create a cooking log entry (the API is idempotent for today)
      const logRes = await fetch("/api/cooking-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: id }),
      });
      if (!logRes.ok) throw new Error("Failed to create cooking log");
      const logData = await logRes.json();
      const cookingLogId = logData.cookingLogId || logData.log?.id;
      if (!cookingLogId) throw new Error("No cooking log ID returned");

      // 2. Upload the image
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      // 3. Save photo to cooking log
      await fetch("/api/cooking-log/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooking_log_id: cookingLogId,
          image_url: uploadData.url,
          caption: "",
        }),
      });

      setPhotoRefreshKey((k) => k + 1);
      showToast("Photo saved!", { variant: "success" });
    } catch (err) {
      console.error("Camera upload error:", err);
      showToast("Failed to upload photo");
    } finally {
      setCameraUploading(false);
      // Reset file input so same file can be picked again
      if (cameraFileRef.current) cameraFileRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: "#F5EEE2" }}>
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3" style={{ backgroundColor: "#F5EEE2" }}>
        <p className="text-[#a09890]">Recipe not found</p>
        <Link href="/recipes" className="text-[#e8530a] text-sm font-medium hover:underline">
          Back to recipes
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6" style={{ backgroundColor: "#F5EEE2", minHeight: "100vh" }}>
        <RecipeForm
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            mutateRecipe();
          }}
        />
      </div>
    );
  }

  // Normalize ingredients: Claude sometimes returns numeric amounts (e.g. 3 instead of "3")
  const ingredients = ((recipe.ingredients as Ingredient[]) || []).map((ing) => ({
    ...ing,
    amount: ing.amount != null ? String(ing.amount) : ing.amount,
    unit: ing.unit != null ? String(ing.unit) : ing.unit,
  }));
  const steps = (recipe.steps as string[]) || [];
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const originalServings = recipe.servings || null;
  const currentServings = adjustedServings ?? originalServings;
  const servingsChanged = originalServings && adjustedServings && adjustedServings !== originalServings;
  const ratio = originalServings && currentServings ? currentServings / originalServings : 1;

  function changeServings(delta: number) {
    const base = currentServings || 1;
    const next = Math.max(1, base + delta);
    setAdjustedServings(next);
    // Show meal plan prompt when servings change from original
    if (originalServings && next !== originalServings) {
      setShowMealPlanPrompt(true);
    }
  }

  function resetServings() {
    setAdjustedServings(null);
    setShowMealPlanPrompt(false);
  }

  const hasMacros = !!(recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g);

  // One ingredient row — preserves standing-sub, dietary-conflict, scaling and
  // unit-conversion behavior. Rendered into the (now 2-column) Ingredients card.
  function renderIngredient(ing: Ingredient, i: number) {
    const standingSub = findStandingSub(ing.name, standingSubs);
    const effective = standingSub
      ? { name: standingSub.to_name, amount: standingSub.to_amount ?? ing.amount, unit: standingSub.to_unit ?? ing.unit ?? "" }
      : ing;

    const scaledAmount = scaleAmount(effective.amount, ratio);
    const numericAmount = (() => {
      if (!effective.amount) return null;
      const raw = effective.amount.trim();
      const mixedMatch = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      if (mixedMatch) return (parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3])) * ratio;
      const fracMatch = raw.match(/^(\d+)\/(\d+)$/);
      if (fracMatch) return (parseInt(fracMatch[1]) / parseInt(fracMatch[2])) * ratio;
      const num = parseFloat(raw);
      return isNaN(num) ? null : num * ratio;
    })();

    const dietaryConflicts = findDietaryConflicts(effective.name, dietaryFilters);

    let displayAmount = scaledAmount;
    let displayUnit = effective.unit || "";
    let wasConverted = false;
    if (unitSystem && numericAmount && effective.unit) {
      const converted = convertUnit(numericAmount, effective.unit, unitSystem);
      if (converted) { displayAmount = formatAmount(converted.amount); displayUnit = converted.unit; wasConverted = true; }
    }

    return (
      <li key={i} className="flex items-baseline gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--tomato, #E5462E)" }} />
        <div className="flex-1 min-w-0 -my-1 flex items-baseline gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubstituteIngredient(ing)}
            className="text-[13.5px] text-gray-800 text-left py-1 transition-colors hover:bg-[rgba(229,70,46,0.04)] rounded-md -mx-1 px-1"
            aria-label={standingSub ? `Substitute ${effective.name} (was ${ing.name})` : `Substitute ${ing.name}`}
          >
            {displayAmount && (
              <span className={`font-semibold ${servingsChanged || wasConverted ? "text-[#e8530a]" : ""}`}>{displayAmount}{" "}</span>
            )}
            {displayUnit && (
              <span className={`${wasConverted ? "text-[#e8530a] font-medium" : "text-gray-500"}`}>{displayUnit}{" "}</span>
            )}
            {effective.name}
          </button>
          {standingSub && (
            <button
              type="button"
              onClick={async () => { await fetch(`/api/user/standing-subs/${standingSub.id}`, { method: "DELETE" }); mutateStandingSubs(); }}
              className="flex-shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors hover:opacity-80"
              style={{ background: "var(--cream-warm, #EFE5D2)", color: "var(--tomato, #E5462E)" }}
              title={`Originally: ${ing.amount}${ing.unit ? " " + ing.unit : ""} ${ing.name}. Tap to revert.`}
            >
              ↳
            </button>
          )}
          {dietaryConflicts.length > 0 && (
            <button
              type="button"
              onClick={() => setSubstituteIngredient(ing)}
              className="flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition-colors hover:opacity-80"
              style={{ background: "rgba(229, 70, 46, 0.10)", color: "var(--tomato, #E5462E)", letterSpacing: "0.08em" }}
              title={`Doesn't fit: ${dietaryConflicts.map((c) => c.label).join(", ")}. Tap to swap.`}
            >
              Needs swap
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EEE2" }}>
      {/* ── 1. Hero Image ──────────────────────────────────────────────── */}
      <div className="relative max-w-3xl mx-auto">
        {recipe.image_url ? (
          <div className="h-72 sm:h-96 bg-gray-100 relative">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.45) 100%)" }} />
          </div>
        ) : (
          <div
            className="h-60 sm:h-72 flex items-center justify-center relative"
            style={{
              background:
                "radial-gradient(circle at 30% 60%, var(--tomato, #E5462E) 0%, transparent 45%), radial-gradient(circle at 80% 30%, var(--mustard, #E8A33D) 0%, transparent 30%), var(--cream-warm, #EFE5D2)",
            }}
          >
            <MealTypeIcon type={recipe.meal_type} className="text-white/85" size={64} strokeWidth={1.5} />
          </div>
        )}

        {/* Time + servings pills */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          {totalTime > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold text-white" style={{ background: "rgba(20,12,5,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
              {totalTime} min total
            </span>
          ) : <span />}
          {recipe.servings ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold text-white" style={{ background: "rgba(20,12,5,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.87M16 4.13A4 4 0 0116 11.6" /></svg>
              {recipe.servings} servings
            </span>
          ) : <span />}
        </div>

        {/* Hidden file input for camera photo upload */}
        <input
          ref={cameraFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCameraFileChange}
          className="hidden"
        />

        {/* Overlaid nav — pushed below the iOS status bar / notch in PWA mode. */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)", paddingBottom: "1rem" }}
        >
          <button
            onClick={() => {
              const from = searchParams?.get("from");
              if (from === "build") {
                router.push("/meal-plan?step=build");
              } else {
                router.back();
              }
            }}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <svg className="w-4.5 h-4.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {/* Bookmark → add to collection (owner only) */}
            {!isPublicView && (
              <button
                onClick={() => setShowAddToCollection(true)}
                aria-label="Add to collection"
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <svg className="w-4.5 h-4.5 text-gray-700" fill={recipeCollections.length > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {!isPublicView && (
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                aria-label="More"
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <svg className="w-4.5 h-4.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMore(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 py-1 min-w-[180px] animate-pop-in text-sm">
                    <button onClick={() => { setShowMore(false); setEditing(true); }} className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">Edit recipe</button>
                    <button onClick={() => { setShowMore(false); cameraFileRef.current?.click(); }} className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">Add a cook photo</button>
                    <button onClick={() => { setShowMore(false); setShowShareWithFriends(true); }} className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">Share with friends</button>
                    {recipe.source_url && (
                      <button onClick={() => { setShowMore(false); window.open(recipe.source_url!, "_blank"); }} className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">View source</button>
                    )}
                    <button onClick={() => { setShowMore(false); handleDelete(); }} disabled={deleting} className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors">{deleting ? "Deleting…" : "Delete recipe"}</button>
                  </div>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-5 pb-10">

        {/* ── 2. Title + rating + tags ──────────────────────────────── */}
        <div className="pt-5 pb-4 space-y-3">
          <h1
            className="leading-[1.05]"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600',
              fontSize: "clamp(1.9rem, 7vw, 2.5rem)",
              letterSpacing: "-0.02em",
              color: "var(--ink, #1C1A17)",
            }}
          >
            {recipe.title}
          </h1>

          {/* Rating + stats inline */}
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[13.5px]" style={{ color: "var(--ink-soft, #4A4742)" }}>
            <span className="inline-flex items-center" aria-label={ratingCount > 0 ? `${ratingAvg} out of 5` : "No ratings yet"}>
              {[1, 2, 3, 4, 5].map((n) => (
                <svg key={n} className="w-4 h-4" viewBox="0 0 24 24" fill={Math.round(ratingAvg) >= n ? "#E8A33D" : "none"} stroke={Math.round(ratingAvg) >= n ? "#E8A33D" : "#d9d0c2"} strokeWidth={1.4}>
                  <path strokeLinejoin="round" d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
                </svg>
              ))}
            </span>
            {ratingCount > 0 ? (
              <span className="font-bold" style={{ color: "var(--ink, #1C1A17)" }}>
                {ratingAvg.toFixed(1)} <span className="font-normal" style={{ color: "var(--ink-soft, #4A4742)" }}>({ratingCount})</span>
              </span>
            ) : (
              <span className="font-medium">New</span>
            )}
            {(recipe.prep_time_minutes || recipe.cook_time_minutes || recipe.servings) && <span style={{ opacity: 0.4 }}>·</span>}
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
                {recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min prep` : ""}
              </span>
            )}
            {recipe.prep_time_minutes && recipe.cook_time_minutes ? <span style={{ opacity: 0.4 }}>·</span> : null}
            {recipe.cook_time_minutes ? <span>{recipe.cook_time_minutes} min cook</span> : null}
            {recipe.servings ? <span style={{ opacity: 0.4 }}>·</span> : null}
            {recipe.servings ? <span>{recipe.servings} servings</span> : null}
          </div>

          {/* Icon tags */}
          {(recipe.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {(recipe.tags || []).map((tag) => <TagChip key={tag} tag={tag} />)}
            </div>
          )}
        </div>

        {/* ── 3. Actions (owner) ─────────────────────────────────────── */}
        {!isPublicView && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setShowAddMealSheet(true)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left active:scale-[0.98] transition-transform"
              style={{ background: "#E5462E", color: "#fff", boxShadow: "0 2px 12px rgba(229,70,46,0.25)" }}
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="17" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M8 2v4M16 2v4M9 14l2 2 4-4" /></svg>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold leading-tight">Add to Meal Plan</span>
                <span className="block text-[11px] opacity-90 leading-tight mt-0.5">Plan this recipe</span>
              </span>
            </button>
            <button
              onClick={() => setShowMarcoChat(true)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left active:scale-[0.98] transition-transform"
              style={{ background: "#fff", border: "1.5px solid rgba(229,70,46,0.45)" }}
            >
              <svg className="w-6 h-6 flex-shrink-0" style={{ color: "#E5462E" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M9 21v-3m6 3v-3M6 18h12a4 4 0 00.5-7.97 6 6 0 00-11.9-.5A3.5 3.5 0 006 18z" /></svg>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold leading-tight" style={{ color: "#1C1A17" }}>Start Guided Cooking</span>
                <span className="block text-[11px] leading-tight mt-0.5" style={{ color: "#6B655C" }}>AI walks you through every step</span>
              </span>
            </button>
          </div>
        )}

        {/* ── Nutrition (per serving) ────────────────────────────────── */}
        {hasMacros && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <h3 className="text-[16px] font-bold mb-3" style={{ color: "#1C1A17" }}>
              Nutrition <span className="text-[13px] font-normal" style={{ color: "#6B655C" }}>per serving</span>
            </h3>
            <div className="grid grid-cols-4 divide-x" style={{ borderColor: "rgba(28,26,23,0.06)" }}>
              {[
                { v: recipe.calories, unit: "", label: "calories", icon: "M12 3c1.5 3 4 4 4 7a4 4 0 01-8 0c0-1.5 1-2.5 1.5-3.5C10 8 12 6 12 3z" },
                { v: recipe.protein_g, unit: "g", label: "protein", icon: "M6.5 4.5l13 13M9 4l11 11M4 9l11 11M14 4l6 6M4 14l6 6" },
                { v: recipe.carbs_g, unit: "g", label: "carbs", icon: "M12 3v6M9 6c-3 1-5 4-5 8a8 8 0 0016 0c0-4-2-7-5-8" },
                { v: recipe.fat_g, unit: "g", label: "fat", icon: "M12 21a7 7 0 01-7-7c0-4 3-7 7-11 4 4 7 7 7 11a7 7 0 01-7 7z" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1 px-1">
                  <svg className="w-5 h-5" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg>
                  <span className="text-[18px] font-bold" style={{ color: "#1C1A17" }}>{m.v != null ? `${Math.round(m.v * ratio)}${m.unit}` : "—"}</span>
                  <span className="text-[11px]" style={{ color: "#8a847a" }}>{m.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px]" style={{ color: "#a8a29a" }}>Percent Daily Values (DV) are based on a 2,000 calorie diet.</p>
          </div>
        )}

        {/* ── Ingredients ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold" style={{ color: "#1C1A17" }}>Ingredients</h3>
            {originalServings && (
              <div className="flex items-center gap-2">
                <span className="text-[13px]" style={{ color: "#6B655C" }}>Scale</span>
                <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => changeServings(-1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#e8530a]/40 hover:text-[#e8530a] active:scale-95 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" d="M5 12h14" />
                        </svg>
                      </button>
                      <span className={`text-sm font-bold w-5 text-center tabular-nums ${servingsChanged ? "text-[#e8530a]" : "text-gray-900"}`}>
                        {currentServings}
                      </span>
                      <button
                        onClick={() => changeServings(1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#e8530a]/40 hover:text-[#e8530a] active:scale-95 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
                        </svg>
                      </button>
                      {servingsChanged && (
                        <button
                          onClick={resetServings}
                          className="text-[10px] text-[#a09890] hover:text-gray-600 font-medium ml-1 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                </div>
              </div>
            )}
          </div>

          {/* Meal plan prompt */}
                {showMealPlanPrompt && servingsChanged && (
                  <div className="mb-5 p-3 bg-orange-50 rounded-xl border border-orange-100 animate-slide-up">
                    <p className="text-xs text-orange-700 font-medium mb-2">
                      Adjusted to {currentServings} servings — add to your meal plan?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowMealPlanPrompt(false); setShowAddMealSheet(true); }}
                        className="flex-1 py-1.5 bg-[#e8530a] text-white rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        Add to Meal Plan
                      </button>
                      <button
                        onClick={() => setShowMealPlanPrompt(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}

          {/* Ingredient list — 2 columns; View all expands the rest */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {(ingredientsExpanded ? ingredients : ingredients.slice(0, 8)).map((ing, i) => renderIngredient(ing, i))}
          </ul>
          {ingredients.length > 8 && (
            <button
              onClick={() => setIngredientsExpanded((v) => !v)}
              className="w-full mt-3.5 flex items-center justify-center gap-1 text-[13.5px] font-semibold"
              style={{ color: "var(--tomato, #E5462E)" }}
            >
              {ingredientsExpanded ? "Show fewer" : "View all ingredients"}
              <svg className={`w-3.5 h-3.5 transition-transform ${ingredientsExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>

        {/* ── Instructions ───────────────────────────────────────────── */}
        {steps.length > 0 && (
          <button
            onClick={() => setShowStepsModal(true)}
            className="w-full bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          >
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--cream-warm, #EFE5D2)", color: "#1C1A17" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h6v16H6a2 2 0 00-2 2V5zM20 5a2 2 0 00-2-2h-6v16h6a2 2 0 012 2V5z" /></svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold" style={{ color: "#1C1A17" }}>Instructions</p>
              <p className="text-[12.5px]" style={{ color: "#6B655C" }}>{steps.length} {steps.length === 1 ? "step" : "steps"}{totalTime > 0 ? ` · About ${totalTime} minutes` : ""}</p>
            </div>
            {recipe.image_url && (
              <img src={recipe.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            )}
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#E5462E" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        )}

        {/* ── I Made This — log the cook (owner only) ─────────────────── */}
        {!isPublicView && (
          <div className="mb-4">
            <IMadeThisButton
              recipeId={recipe.id}
              onPhotoAdded={() => setPhotoRefreshKey((k) => k + 1)}
            />
          </div>
        )}

        {/* ── Cook Photos (owner only) ───────────────────────────────── */}
        {!isPublicView && (
          <CookPhotosGallery recipeId={recipe.id} refreshKey={photoRefreshKey} />
        )}

        {/* ── Original Recipe Video ──────────────────────────────────── */}
        {recipe.source_url && (
          <button
            onClick={() => window.open(recipe.source_url!, "_blank")}
            className="w-full bg-white rounded-2xl shadow-sm p-3 mb-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          >
            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#eeece8" }}>
              {recipe.image_url && <img src={recipe.image_url} alt="" className="w-full h-full object-cover" />}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-7 h-7 rounded-full bg-white/85 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 ml-0.5" style={{ color: "#1C1A17" }} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold" style={{ color: "#1C1A17" }}>Original Recipe Video</p>
              <p className="text-[12px] capitalize" style={{ color: "#6B655C" }}>
                {recipe.source_platform && recipe.source_platform !== "other" ? recipe.source_platform : "View original"}
              </p>
            </div>
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#6B655C" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          </button>
        )}

        {/* ── Reviews + My Notes ─────────────────────────────────────── */}
        <div className={`grid ${isPublicView ? "grid-cols-1" : "grid-cols-2"} gap-3 mb-4`}>
          <button
            onClick={() => setShowRatingSheet(true)}
            className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill={ratingCount > 0 ? "#E8A33D" : "none"} stroke="#E8A33D" strokeWidth={1.5}><path strokeLinejoin="round" d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" /></svg>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold" style={{ color: "#1C1A17" }}>Reviews</p>
              <p className="text-[12px]" style={{ color: "#6B655C" }}>{ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : "Rate this recipe"}</p>
            </div>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#c5beb2" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          {!isPublicView && (
            <button
              onClick={() => setShowNotesSheet(true)}
              className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform"
            >
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m3 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold" style={{ color: "#1C1A17" }}>My Notes</p>
                <p className="text-[12px] line-clamp-1" style={{ color: "#6B655C" }}>Add your notes, tips, or modifications</p>
              </div>
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#c5beb2" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>

        {/* spacer — public view keeps the sticky save bar, owner is inline */}
        <div style={{ height: isPublicView ? "18vh" : "2rem" }} />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AddToCollectionModal
        recipeId={recipe.id}
        isOpen={showAddToCollection}
        onClose={() => {
          setShowAddToCollection(false);
          mutateCollections();
        }}
      />

      <ShareWithFriendsModal
        isOpen={showShareWithFriends}
        onClose={() => setShowShareWithFriends(false)}
        itemType="recipe"
        itemId={recipe.id}
        itemTitle={recipe.title}
      />

      <AddMealSheet
        isOpen={showAddMealSheet}
        onClose={() => setShowAddMealSheet(false)}
        defaultDate={todayStr}
        weekStart={weekStart}
        allRecipes={allRecipesData}
        defaultRecipeId={recipe.id}
        defaultServings={currentServings || undefined}
        onAdd={handleMealSheetAdd}
      />

      {/* ── Sticky save bar (public view only) ───────────────────────── */}
      {isPublicView && (
      <div className="fixed bottom-0 left-0 right-0 max-w-3xl mx-auto z-40 rounded-t-2xl overflow-hidden" style={{ paddingBottom: "var(--safe-bottom, 0px)", background: "#ffffff", boxShadow: "0 -8px 30px rgba(0,0,0,0.12)" }}>
        <div className="px-4 py-3 space-y-2">
            <button
              onClick={async () => {
                if (alreadySaved || savingPublic) return;
                setSavingPublic(true);
                try {
                  const r = recipe as unknown as Record<string, unknown>;
                  const res = await fetch("/api/recipes/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: r.title,
                      description: r.description,
                      image_url: r.image_url,
                      tags: r.tags || [],
                      meal_type: r.meal_type,
                      servings: r.servings,
                      prep_time_minutes: r.prep_time_minutes,
                      cook_time_minutes: r.cook_time_minutes,
                      ingredients: r.ingredients || [],
                      steps: r.steps || [],
                      source_url: r.source_url,
                      calories: r.calories,
                      protein_g: r.protein_g,
                      carbs_g: r.carbs_g,
                      fat_g: r.fat_g,
                      fiber_g: r.fiber_g,
                    }),
                  });
                  const data = await res.json();
                  const saved = data?.recipe as Recipe | undefined;
                  if (saved?.id) {
                    // Prepopulate caches so the destination page renders the
                    // owned view immediately, no skeleton, no flash.
                    swrMutate(["supabase:recipe", saved.id], saved, false);
                    swrMutate(
                      "supabase:recipes",
                      (current: Recipe[] | undefined) => {
                        const list = current ?? [];
                        if (list.some((row) => row.id === saved.id)) return list;
                        return [saved, ...list];
                      },
                      false,
                    );
                    showToast("Recipe saved to your library");
                    router.replace(`/recipes/${saved.id}`);
                  } else {
                    showToast("Could not save recipe");
                    setSavingPublic(false);
                  }
                } catch {
                  showToast("Could not save recipe");
                  setSavingPublic(false);
                }
              }}
              disabled={alreadySaved || savingPublic}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ background: alreadySaved ? "#94a394" : "#e8530a" }}
            >
              {alreadySaved ? "✓ Already in your library" : savingPublic ? "Saving…" : "Save to my library"}
            </button>
        </div>
      </div>
      )}

      {savingPublic && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
          style={{
            background: "var(--cream, #F5EEE2)",
            paddingBottom: "var(--safe-bottom, 0px)",
          }}
        >
          <span
            className="marco-signature is-pulsing"
            style={{ fontSize: "4.5rem" }}
          >
            Marco
          </span>
          <p
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontStyle: "italic",
              fontVariationSettings: '"opsz" 14, "SOFT" 100, "wght" 400',
              fontSize: "20px",
              color: "var(--ink, #1C1A17)",
              marginTop: "1.75rem",
            }}
          >
            Saving to your library
          </p>
          <p
            className="marco-mono"
            style={{ marginTop: "0.75rem", color: "var(--ink-soft, #4A4742)" }}
          >
            One sec
          </p>
        </div>
      )}

      {/* Cook with Marco — Phase 1 now-playing step view. Conditionally
          rendered (rather than passing isOpen) so state resets cleanly
          between cook sessions via unmount/remount. */}
      {recipe && showMarcoChat && (
        <CookMode
          recipe={recipe}
          onClose={() => setShowMarcoChat(false)}
        />
      )}

      {/* Substitution sheet — Phase 1 one-time-swap. Tap any ingredient
          to open this. */}
      {recipe && substituteIngredient && (
        <SubstitutionSheet
          recipeId={recipe.id}
          target={substituteIngredient}
          onClose={() => setSubstituteIngredient(null)}
          onStandingPrefAdded={() => mutateStandingSubs()}
        />
      )}

      {/* Instructions — plain numbered steps (the "Start Guided Cooking"
          button opens the AI CookMode instead). */}
      {showStepsModal && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setShowStepsModal(false)} />
          <div
            className="fixed left-0 right-0 bottom-0 z-[61] rounded-t-3xl"
            style={{ background: "#FBF7EF", maxHeight: "88vh", overflowY: "auto", paddingBottom: "calc(var(--safe-bottom, 0px) + 20px)", boxShadow: "0 -12px 40px rgba(20,12,5,0.18)", animation: "sheetUp 0.24s cubic-bezier(0.34,1.1,0.64,1) both" }}
          >
            <div className="max-w-3xl mx-auto px-5 pt-3">
              <div className="mx-auto mb-4 rounded-full" style={{ width: 40, height: 4, background: "rgba(28,26,23,0.15)" }} />
              <div className="flex items-center justify-between mb-5">
                <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 22, color: "#1C1A17" }}>Instructions</h3>
                <button onClick={() => setShowStepsModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                  <svg className="w-4 h-4" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <ol className="space-y-5 pb-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: "var(--tomato, #E5462E)" }}>{i + 1}</span>
                    <p className="text-[14px] leading-relaxed flex-1 pt-0.5" style={{ color: "#3a3530" }}>{step}</p>
                  </li>
                ))}
              </ol>
              {!isPublicView && (
                <button
                  onClick={() => { setShowStepsModal(false); setShowMarcoChat(true); }}
                  className="w-full mt-3 py-3.5 rounded-2xl font-semibold text-[14px] text-white active:scale-[0.98] transition-all"
                  style={{ background: "#E5462E" }}
                >
                  Start Guided Cooking
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reviews — rate this recipe (community rating) */}
      {showRatingSheet && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setShowRatingSheet(false)} />
          <div
            className="fixed left-0 right-0 bottom-0 z-[61] rounded-t-3xl"
            style={{ background: "#FBF7EF", paddingBottom: "calc(var(--safe-bottom, 0px) + 24px)", boxShadow: "0 -12px 40px rgba(20,12,5,0.18)", animation: "sheetUp 0.24s cubic-bezier(0.34,1.1,0.64,1) both" }}
          >
            <div className="max-w-md mx-auto px-5 pt-3">
              <div className="mx-auto mb-4 rounded-full" style={{ width: 40, height: 4, background: "rgba(28,26,23,0.15)" }} />
              <h3 className="mb-1" style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 20, color: "#1C1A17" }}>
                {ratingCount > 0 ? `${ratingAvg.toFixed(1)} · ${ratingCount} ${ratingCount === 1 ? "rating" : "ratings"}` : "Be the first to rate"}
              </h3>
              <p className="text-[13px] mb-4" style={{ color: "#6B655C" }}>Tap a star to rate this recipe.</p>
              <RecipeRating recipeId={recipe.id} />
              <button onClick={() => setShowRatingSheet(false)} className="w-full mt-6 py-3.5 rounded-2xl font-semibold text-[14px] text-white active:scale-[0.98] transition-all" style={{ background: "#1C1A17" }}>Done</button>
            </div>
          </div>
        </>
      )}

      {/* My Notes — private per-recipe notes */}
      {!isPublicView && showNotesSheet && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setShowNotesSheet(false)} />
          <div
            className="fixed left-0 right-0 bottom-0 z-[61] rounded-t-3xl"
            style={{ background: "#FBF7EF", maxHeight: "88vh", overflowY: "auto", paddingBottom: "calc(var(--safe-bottom, 0px) + 24px)", boxShadow: "0 -12px 40px rgba(20,12,5,0.18)", animation: "sheetUp 0.24s cubic-bezier(0.34,1.1,0.64,1) both" }}
          >
            <div className="max-w-md mx-auto px-5 pt-3">
              <div className="mx-auto mb-4 rounded-full" style={{ width: 40, height: 4, background: "rgba(28,26,23,0.15)" }} />
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)", fontVariationSettings: '"opsz" 60, "wght" 600', fontSize: 20, color: "#1C1A17" }}>My Notes</h3>
                <button onClick={() => setShowNotesSheet(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                  <svg className="w-4 h-4" style={{ color: "#1C1A17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <MyNotesCard recipeId={recipe.id} />
            </div>
          </div>
        </>
      )}

      {/* Cook-photo upload indicator */}
      {cameraUploading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium" style={{ background: "rgba(20,12,5,0.85)" }}>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Saving photo…
        </div>
      )}
    </div>
  );
}
