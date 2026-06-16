"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SocialProofStep from "@/components/onboarding/guided/SocialProofStep";
import GoalsStep from "@/components/onboarding/guided/GoalsStep";
import GoalsAffirmationStep from "@/components/onboarding/guided/GoalsAffirmationStep";
import RecipeSourcesStep from "@/components/onboarding/guided/RecipeSourcesStep";
import SourcesAffirmationStep from "@/components/onboarding/guided/SourcesAffirmationStep";
import MealPlanTimingStep from "@/components/onboarding/guided/MealPlanTimingStep";
import NotificationsStep from "@/components/onboarding/guided/NotificationsStep";
import MealPlanFeatureStep from "@/components/onboarding/guided/MealPlanFeatureStep";
import GroceryFeatureStep from "@/components/onboarding/guided/GroceryFeatureStep";
import PersonalizeAffirmationStep from "@/components/onboarding/guided/PersonalizeAffirmationStep";
import AgeStep from "@/components/onboarding/guided/AgeStep";
import CreateHouseholdStep from "@/components/onboarding/cookbook/CreateHouseholdStep";
import RecipeImportStep, { type SavedRecipe } from "@/components/onboarding/cookbook/RecipeImportStep";
import GuidedDemo from "@/components/onboarding/cookbook/GuidedDemo";
import AllergiesStep from "@/components/onboarding/AllergiesStep";
import SignatureDishStep from "@/components/onboarding/SignatureDishStep";
import DinnerRankingStep from "@/components/onboarding/DinnerRankingStep";
import TasteProfileOverlay from "@/components/onboarding/TasteProfileOverlay";
import PlusUpsell from "@/components/onboarding/paywall/PlusUpsell";
import { purchasePlus } from "@/lib/purchases";
import { invalidateEntitlement } from "@/lib/useEntitlement";
import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

// Soft paywall ON: the post–Taste DNA Plus upsell shows after the reveal, but
// billing isn't wired yet — purchasePlus() is a no-op on web/until RevenueCat
// (Phase 2), so "Start for $0.00" just continues into the app without charging.
// This measures intent; flip to false to hide the upsell entirely.
const PAYWALL_ENABLED = true;

// Step map (ReciMe-style guided flow; cookbook-themed steps are being
// converted screen by screen). Household moved much later — it's now the
// last data-collection step before the Taste DNA reveal:
//   0  Social proof (guided)
//   1  Goals — what are your goals? (guided)
//   2  Goals affirmation — "That's great!" (guided)
//   3  Recipe sources — where do you get your recipes? (guided)
//   4  Sources affirmation — "Awesome 🎉" (guided)
//   5  Add to your cookbook — paste links / photos, saves to account (guided)
//   6  Guided first-run — taps through the seeded recipe (guided chrome)
//   7  Meal-plan timing — when do you think about cooking? (guided)
//   8  Notifications — get the right recipe at the right time (guided)
//   9  Meal-plan feature — plan your week showcase (guided)
//   10 Grocery feature — shop in one trip showcase (guided)
//   11 Personalize — "Now let's make it yours" transition (guided)
//   12 Age — how old are you? (guided)
//   13 Allergies (guided)
//   14 Signature dish (guided)
//   15 Dinner ranking (guided)
//   16 Create a household (guided)
//   17 Taste profile reveal (guided)
const PROFILE_STEP = 17;
const PAYWALL_STEP = 18;
const TOTAL_STEPS = PAYWALL_ENABLED ? 19 : 18;
const STORAGE_KEY = "marco_onboarding";

interface OnboardingState {
  goals: string[];
  recipeSources: string[];
  planTiming: string;
  ageRange: string;
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
  goals: [],
  recipeSources: [],
  planTiming: "",
  ageRange: "",
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

  // Final landing into the app. With the paywall off, TasteProfileOverlay still
  // handles this itself; with it on, the paywall step calls this on skip/start.
  const landInApp = useCallback(() => {
    router.replace("/recipes");
    setTimeout(() => { try { window.dispatchEvent(new CustomEvent("openFabImport")); } catch { /* noop */ } }, 800);
  }, [router]);

  // Start the trial via RevenueCat. On native: run the StoreKit purchase, and
  // only on a real cancellation do we keep the user on the paywall. On web (or
  // if purchases are unavailable) we fall through to the app so the flow never
  // dead-ends. The webhook is the source of truth for entitlement; we just
  // invalidate the client cache so the next read reflects Plus.
  const handleStartTrial = useCallback(async (plan: "annual" | "monthly") => {
    const result = await purchasePlus(plan);
    if (result.cancelled) return; // stay on the paywall
    if (result.active) invalidateEntitlement();
    landInApp();
  }, [landInApp]);

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
      return (
        <SocialProofStep
          step={1}
          totalSteps={TOTAL_STEPS}
          onBack={() => router.push("/auth/signup")}
          onContinue={goForward}
        />
      );
    case 1:
      return (
        <GoalsStep
          step={2}
          totalSteps={TOTAL_STEPS}
          value={data.goals}
          onBack={goBack}
          onNext={(goals) => { update({ goals }); goForward(); }}
        />
      );
    case 2:
      return (
        <GoalsAffirmationStep
          step={3}
          totalSteps={TOTAL_STEPS}
          goals={data.goals}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 3:
      return (
        <RecipeSourcesStep
          step={4}
          totalSteps={TOTAL_STEPS}
          value={data.recipeSources}
          onBack={goBack}
          onNext={(recipeSources) => { update({ recipeSources }); goForward(); }}
        />
      );
    case 4:
      return (
        <SourcesAffirmationStep
          step={5}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 5:
      return (
        <RecipeImportStep
          step={6}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(recipes) => { update({ importedRecipes: recipes }); goForward(); }}
        />
      );
    case 6:
      return (
        <GuidedDemo
          recipes={data.importedRecipes}
          step={7}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onComplete={goForward}
        />
      );
    case 7:
      return (
        <MealPlanTimingStep
          step={8}
          totalSteps={TOTAL_STEPS}
          value={data.planTiming}
          onBack={goBack}
          onNext={(planTiming) => { update({ planTiming }); goForward(); }}
        />
      );
    case 8:
      return (
        <NotificationsStep
          step={9}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 9:
      return (
        <MealPlanFeatureStep
          step={10}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 10:
      return (
        <GroceryFeatureStep
          step={11}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 11:
      return (
        <PersonalizeAffirmationStep
          step={12}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 12:
      return (
        <AgeStep
          step={13}
          totalSteps={TOTAL_STEPS}
          value={data.ageRange}
          onBack={goBack}
          onNext={(ageRange) => { update({ ageRange }); goForward(); }}
        />
      );
    case 13:
      return (
        <AllergiesStep
          value={data.allergies}
          step={14}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(allergies) => { update({ allergies }); goForward(); }}
        />
      );
    case 14:
      return (
        <SignatureDishStep
          value={data.signatureDish}
          step={15}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(dish) => { update({ signatureDish: dish }); goForward(); }}
        />
      );
    case 15:
      return (
        <DinnerRankingStep
          step={16}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(rankedIds, rankedRecipes) => { update({ rankedIds, rankedRecipes }); goForward(); }}
        />
      );
    case 16:
      return (
        <CreateHouseholdStep
          size={data.householdSize}
          type={data.householdType}
          step={17}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onComplete={(joined, size, type) => {
            update({ joinedHousehold: joined, householdSize: size, householdType: type });
            goForward();
          }}
        />
      );
    case PROFILE_STEP:
      return (
        <TasteProfileOverlay
          rankedIds={data.rankedIds}
          rankedRecipes={data.rankedRecipes}
          signatureDish={data.signatureDish}
          allergies={data.allergies}
          step={18}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onComplete={handleComplete}
          onShowPaywall={PAYWALL_ENABLED ? goForward : undefined}
        />
      );
    case PAYWALL_STEP:
      return (
        <PlusUpsell
          onStartTrial={(plan) => handleStartTrial(plan)}
          onSkip={() => landInApp()}
        />
      );
    default:
      return null;
  }
}
