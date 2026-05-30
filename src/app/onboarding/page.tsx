"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CookbookOpening from "@/components/onboarding/cookbook/CookbookOpening";
import CreateHouseholdStep from "@/components/onboarding/cookbook/CreateHouseholdStep";
import RecipeImportStep, { type SavedRecipe } from "@/components/onboarding/cookbook/RecipeImportStep";
import DemoStep from "@/components/onboarding/cookbook/DemoStep";
import AllergiesStep from "@/components/onboarding/AllergiesStep";
import SignatureDishStep from "@/components/onboarding/SignatureDishStep";
import DinnerRankingStep from "@/components/onboarding/DinnerRankingStep";
import TasteProfileOverlay from "@/components/onboarding/TasteProfileOverlay";
import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

// Step map (the AutoDemo "video" step is intentionally removed — kept in repo,
// unreferenced. DemoStep is the new personalized walkthrough):
//   0  Cover (CookbookOpening)
//   1  Create a household (join by code or start new + size/type)
//   2  Add to your cookbook — paste links / photos, saves to account
//   3  Demo — personalized walkthrough using the recipes they just added
//   4  Allergies
//   5  Signature dish
//   6  Dinner ranking
//   7  Taste profile reveal (full overlay)
const TOTAL_STEPS = 8;
const PROFILE_STEP = 7;
const STORAGE_KEY = "marco_onboarding";

interface OnboardingState {
  importedRecipes: SavedRecipe[];
  joinedHousehold: boolean;
  householdSize: number;
  householdType: string | null;
  allergies: string[];
  rankedIds: string[];
  rankedRecipes: RankingRecipe[];
  signatureDish: string;
  tasteProfile: Record<string, string[]>;
}

const defaultState: OnboardingState = {
  importedRecipes: [],
  joinedHousehold: false,
  householdSize: 1,
  householdType: null,
  allergies: [],
  rankedIds: [],
  rankedRecipes: [],
  signatureDish: "",
  tasteProfile: {},
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (!user) { router.replace("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
        router.replace("/recipes");
        return;
      }

      // Always start at the cover (step 0) so a new account / guest reliably
      // sees the "Build My Recipe Book" opening. We restore saved *answers*
      // (so nothing is lost) but never the saved step — resuming past the
      // cover was hiding it for anyone who'd entered onboarding before.
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.data) {
            setData({ ...defaultState, ...parsed.data, rankedRecipes: parsed.data.rankedRecipes || [], importedRecipes: parsed.data.importedRecipes || [] });
          }
        }
      } catch { /* ignore */ }
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
      } catch { /* ignore */ }
    }
  }, [step, data, ready]);

  const goForward = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);
  const goBack = useCallback(() => setStep((prev) => Math.max(prev - 1, 0)), []);

  const update = useCallback((partial: Partial<OnboardingState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleComplete = useCallback(async (
    tasteScores?: { sweet: number; savory: number; richness: number; tangy: number },
    cuisinePreferences?: string[],
  ) => {
    try {
      const payload = { ...data, tasteScores, cuisinePreferences };
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
    } catch { /* continue anyway */ }
    localStorage.removeItem(STORAGE_KEY);
  }, [data]);

  if (!ready) {
    return (
      <div className="max-w-2xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "#E5462E", animation: `pulse-soft 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  switch (step) {
    case 0:
      return <CookbookOpening onOpen={goForward} />;
    case 1:
      return (
        <CreateHouseholdStep
          size={data.householdSize}
          type={data.householdType}
          pageNumber={1}
          onBack={goBack}
          onComplete={(joined, size, type) => {
            update({ joinedHousehold: joined, householdSize: size, householdType: type });
            goForward();
          }}
        />
      );
    case 2:
      return (
        <RecipeImportStep
          pageNumber={2}
          onBack={goBack}
          onNext={(recipes) => { update({ importedRecipes: recipes }); goForward(); }}
        />
      );
    case 3:
      return (
        <DemoStep
          recipes={data.importedRecipes}
          pageNumber={3}
          onBack={goBack}
          onNext={goForward}
        />
      );
    case 4:
      return (
        <AllergiesStep
          value={data.allergies}
          pageNumber={4}
          onBack={goBack}
          onNext={(allergies) => { update({ allergies }); goForward(); }}
        />
      );
    case 5:
      return (
        <SignatureDishStep
          value={data.signatureDish}
          pageNumber={5}
          onBack={goBack}
          onNext={(dish) => { update({ signatureDish: dish }); goForward(); }}
        />
      );
    case 6:
      return (
        <DinnerRankingStep
          pageNumber={6}
          onBack={goBack}
          onNext={(rankedIds, rankedRecipes) => { update({ rankedIds, rankedRecipes }); goForward(); }}
        />
      );
    case PROFILE_STEP:
      return (
        <TasteProfileOverlay
          rankedIds={data.rankedIds}
          rankedRecipes={data.rankedRecipes}
          signatureDish={data.signatureDish}
          allergies={data.allergies}
          onBack={goBack}
          onComplete={handleComplete}
        />
      );
    default:
      return null;
  }
}
