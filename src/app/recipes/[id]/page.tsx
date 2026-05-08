"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import useSWR, { mutate as swrMutate } from "swr";
import dynamic from "next/dynamic";
import type { Recipe, Ingredient } from "@/types";
import { useRecipe, useRecipes, apiFetcher } from "@/lib/hooks/use-data";
import SocialEmbed from "@/components/recipes/SocialEmbed";
import IMadeThisButton from "@/components/gamification/IMadeThisButton";
import MyNotesCard from "@/components/recipes/MyNotesCard";
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

export default function RecipeDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showShareWithFriends, setShowShareWithFriends] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps" | "nutrition">("ingredients");
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
          </div>
        ) : (
          <div
            className="h-52 sm:h-64 flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 30% 60%, var(--tomato, #E5462E) 0%, transparent 45%), radial-gradient(circle at 80% 30%, var(--mustard, #E8A33D) 0%, transparent 30%), var(--cream-warm, #EFE5D2)",
            }}
          >
            <MealTypeIcon type={recipe.meal_type} className="text-white/85" size={64} strokeWidth={1.5} />
          </div>
        )}

        {/* I Made This — bottom-right overlay (owner only).
            Renders on both photo + gradient-fallback heroes. */}
        {!isPublicView && (
          <button
            onClick={() => cameraFileRef.current?.click()}
            disabled={cameraUploading}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors z-10"
            aria-label="I Made This"
          >
            {cameraUploading ? (
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <span className="text-xs font-semibold text-gray-700">I Made This</span>
              </>
            )}
          </button>
        )}

        {/* Hidden file input for camera photo upload */}
        <input
          ref={cameraFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCameraFileChange}
          className="hidden"
        />

        {/* Overlaid nav — pushed below the iOS status bar / notch in PWA mode.
            env(safe-area-inset-top) is 0 in regular Safari (since the status
            bar already overlays the page content there), so this only adds
            extra spacing when the app is installed as a PWA. */}
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
            {!isPublicView && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 shadow-sm hover:bg-white transition-colors"
            >
              Edit
            </button>
            )}
            <div className="relative">
              {!isPublicView && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <svg className="w-4.5 h-4.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
              )}
              {showMore && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMore(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 py-1 min-w-[140px] animate-pop-in">
                    <button
                      onClick={() => { setShowMore(false); handleDelete(); }}
                      disabled={deleting}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deleting ? "Deleting..." : "Delete recipe"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-5 pb-10">

        {/* ── 2. Title section ────────────────────────────────────────── */}
        <div className="py-6 space-y-3">
          {/* Recipe title — Fraunces display */}
          <h1
            className="leading-tight"
            style={{
              fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
              fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600',
              fontSize: "clamp(1.75rem, 6vw, 2.25rem)",
              letterSpacing: "-0.02em",
              color: "var(--ink, #1C1A17)",
            }}
          >
            {recipe.title}
          </h1>

          {/* Stats row — Marco mono uppercase tracked metadata */}
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-soft, #4A4742)",
            }}
          >
            {recipe.meal_type && (
              <span className="inline-flex items-center gap-1.5">
                <MealTypeIcon type={recipe.meal_type} className="w-3.5 h-3.5" strokeWidth={2} />
                {recipe.meal_type}
              </span>
            )}
            {recipe.meal_type && totalTime > 0 && <span style={{ opacity: 0.5 }}>·</span>}
            {totalTime > 0 && (
              <span>
                {recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m prep` : ""}
                {recipe.prep_time_minutes && recipe.cook_time_minutes ? " + " : ""}
                {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m cook` : ""}
              </span>
            )}
            {(recipe.meal_type || totalTime > 0) && recipe.servings && <span style={{ opacity: 0.5 }}>·</span>}
            {recipe.servings && (
              <span>{recipe.servings} servings</span>
            )}
          </div>

          {/* Tags — Marco cream-warm pills with body font */}
          {(recipe.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(recipe.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: "var(--cream-warm, #EFE5D2)",
                    color: "var(--ink-soft, #4A4742)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Collections this recipe belongs to */}
          {recipeCollections.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {recipeCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="px-2.5 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[11px] font-medium hover:bg-orange-100 transition-colors"
                >
                  {col.name}
                </Link>
              ))}
            </div>
          )}

          {/* Action buttons with labels */}
          <div className="flex items-center gap-5 pt-2">
            {/* Collection (owner only) */}
            {!isPublicView && (
              <button
                onClick={() => setShowAddToCollection(true)}
                className="flex flex-col items-center gap-1 text-[#a09890] hover:text-[#e8530a] transition-colors touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                <span className="text-[10px] font-medium">Collection</span>
              </button>
            )}
            {/* Share (owner only) */}
            {!isPublicView && (
              <button
                onClick={() => setShowShareWithFriends(true)}
                className="flex flex-col items-center gap-1 text-[#a09890] hover:text-[#e8530a] transition-colors touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                </svg>
                <span className="text-[10px] font-medium">Share</span>
              </button>
            )}
            {/* Source */}
            {recipe.source_url && (
              <button
                onClick={() => window.open(recipe.source_url!, "_blank")}
                className="flex flex-col items-center gap-1 text-[#a09890] hover:text-[#e8530a] transition-colors touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                <span className="text-[10px] font-medium">Source</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Three tabs: Ingredients | Steps | Macros ──────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tab bar — Marco palette: tomato accent, ink-soft inactive */}
          <div className="flex border-b" style={{ borderColor: "var(--line, rgba(28,26,23,0.08))" }}>
            {(["ingredients", "steps", "nutrition"] as const).map((tab) => {
              // Hide macros tab if no macro data
              if (tab === "nutrition" && !hasMacros) return null;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3.5 text-sm text-center transition-colors relative capitalize"
                  style={{
                    color: isActive ? "var(--tomato, #E5462E)" : "var(--ink-soft, #4A4742)",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {tab}
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: "var(--tomato, #E5462E)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {/* ── Ingredients tab ──────────────────────────────────────── */}
            {activeTab === "ingredients" && (
              <div>
                {/* Servings adjuster */}
                {originalServings && (
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">Servings</span>
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

                {/* Ingredient list */}
                <ul className="space-y-3">
                  {ingredients.map((ing, i) => {
                    const scaledAmount = scaleAmount(ing.amount, ratio);
                    const numericAmount = (() => {
                      if (!ing.amount) return null;
                      const raw = ing.amount.trim();
                      const mixedMatch = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
                      if (mixedMatch) return (parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3])) * ratio;
                      const fracMatch = raw.match(/^(\d+)\/(\d+)$/);
                      if (fracMatch) return (parseInt(fracMatch[1]) / parseInt(fracMatch[2])) * ratio;
                      const num = parseFloat(raw);
                      return isNaN(num) ? null : num * ratio;
                    })();

                    let displayAmount = scaledAmount;
                    let displayUnit = ing.unit || "";
                    let wasConverted = false;

                    if (unitSystem && numericAmount && ing.unit) {
                      const converted = convertUnit(numericAmount, ing.unit, unitSystem);
                      if (converted) {
                        displayAmount = formatAmount(converted.amount);
                        displayUnit = converted.unit;
                        wasConverted = true;
                      }
                    }

                    return (
                      <li key={i} className="flex items-baseline gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1C1A17] flex-shrink-0 mt-1.5" />
                        <button
                          type="button"
                          onClick={() => setSubstituteIngredient(ing)}
                          className="text-sm text-gray-800 text-left flex-1 -my-1 py-1 transition-colors hover:bg-[rgba(229,70,46,0.04)] rounded-md -mx-1 px-1"
                          aria-label={`Substitute ${ing.name}`}
                        >
                          {displayAmount && (
                            <span className={`font-semibold ${servingsChanged || wasConverted ? "text-[#e8530a]" : ""}`}>
                              {displayAmount}{" "}
                            </span>
                          )}
                          {displayUnit && (
                            <span className={`${wasConverted ? "text-[#e8530a] font-medium" : "text-gray-500"}`}>
                              {displayUnit}{" "}
                            </span>
                          )}
                          {ing.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ── Steps tab ───────────────────────────────────────────── */}
            {activeTab === "steps" && (
              <ol className="space-y-6">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full bg-gray-100 text-[#1C1A17] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed flex-1 pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            )}

            {/* ── Nutrition tab ──────────────────────────────────────── */}
            {activeTab === "nutrition" && hasMacros && (
              <div className="space-y-5 py-2">
                {/* Calories */}
                {recipe.calories != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    <span className="text-3xl font-bold text-[#1C1A17]">
                      {Math.round(recipe.calories * ratio)}
                    </span>
                    <span className="text-sm text-gray-400 font-medium">cal</span>
                  </div>
                )}

                {/* Protein / Carbs / Fats */}
                <div className="grid grid-cols-3 gap-6">
                  {recipe.protein_g != null && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">🥩 Protein</div>
                      <div className="text-xl font-bold text-[#1C1A17]">{Math.round(recipe.protein_g * ratio)}g</div>
                    </div>
                  )}
                  {recipe.carbs_g != null && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">🌾 Carbs</div>
                      <div className="text-xl font-bold text-[#1C1A17]">{Math.round(recipe.carbs_g * ratio)}g</div>
                    </div>
                  )}
                  {recipe.fat_g != null && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">🧈 Fats</div>
                      <div className="text-xl font-bold text-[#1C1A17]">{Math.round(recipe.fat_g * ratio)}g</div>
                    </div>
                  )}
                </div>

                {/* Fiber */}
                {recipe.fiber_g != null && recipe.fiber_g > 0 && (
                  <p className="text-xs text-gray-400">
                    {Math.round(recipe.fiber_g * ratio)}g fiber per serving
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Cook Photos (owner only) ───────────────────────────────── */}
        {!isPublicView && (
          <CookPhotosGallery recipeId={recipe.id} refreshKey={photoRefreshKey} />
        )}

        {/* ── 4. My Notes (owner only) ─────────────────────────────────── */}
        {!isPublicView && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
            <MyNotesCard recipeId={recipe.id} />
          </div>
        )}

        {/* ── 5. Original Post ────────────────────────────────────────── */}
        {recipe.source_url && recipe.source_platform && recipe.source_platform !== "other" && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
            <SocialEmbed
              sourceUrl={recipe.source_url}
              sourcePlatform={recipe.source_platform}
            />
          </div>
        )}

        {/* spacer for sticky bottom bar + room to scroll inputs above mobile keyboard */}
        <div style={{ height: "60vh" }} />
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

      {/* ── Sticky bottom bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-3xl mx-auto z-40 rounded-t-2xl overflow-hidden" style={{ paddingBottom: "var(--safe-bottom, 0px)", background: "#ffffff", boxShadow: "0 -8px 30px rgba(0,0,0,0.12)" }}>
        <div className="px-4 py-3 space-y-2">
          {isPublicView ? (
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
          ) : (
            <>
              <button
                onClick={() => setShowAddMealSheet(true)}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white active:scale-[0.98] transition-all"
                style={{ background: "#e8530a" }}
              >
                Add to Meal Plan
              </button>
              <button
                onClick={() => setShowMarcoChat(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all border inline-flex items-center justify-center gap-2"
                style={{ borderColor: "var(--line, rgba(28,26,23,0.12))", color: "var(--ink, #1C1A17)", background: "white" }}
              >
                <span>Cook with</span>
                {/* Marco signature mark with the tomato punctum \u2014 replaces the chef emoji */}
                <span className="marco-signature" style={{ fontSize: "1.25rem" }}>marco</span>
                <span
                  className="ml-0.5 px-1.5 py-0.5 rounded-full align-middle"
                  style={{
                    background: "var(--cream-warm, #EFE5D2)",
                    color: "var(--tomato, #E5462E)",
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  beta
                </span>
              </button>
            </>
          )}
        </div>
      </div>

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
            marco
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
          on the Ingredients tab to open this. */}
      {recipe && substituteIngredient && (
        <SubstitutionSheet
          recipeId={recipe.id}
          target={substituteIngredient}
          onClose={() => setSubstituteIngredient(null)}
        />
      )}
    </div>
  );
}
