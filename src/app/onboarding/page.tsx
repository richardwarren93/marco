"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoalsStep from "@/components/onboarding/guided/GoalsStep";
import RecipeSourcesStep from "@/components/onboarding/guided/RecipeSourcesStep";
import MealCountStep from "@/components/onboarding/guided/MealCountStep";
import GoalReinforcementStep from "@/components/onboarding/guided/GoalReinforcementStep";
import NotificationsStep from "@/components/onboarding/guided/NotificationsStep";
import MadeForYouStep from "@/components/onboarding/guided/MadeForYouStep";
import CreateHouseholdStep from "@/components/onboarding/cookbook/CreateHouseholdStep";
import RecipeImportStep, { type SavedRecipe } from "@/components/onboarding/cookbook/RecipeImportStep";
import GuidedDemo from "@/components/onboarding/cookbook/GuidedDemo";
import AllergiesStep from "@/components/onboarding/AllergiesStep";
import DietaryFlagStep from "@/components/onboarding/guided/DietaryFlagStep";
// Parked steps — removed from the flow for now, kept for an easy bring-back:
//   MealPlanTimingStep, MealPlanFeatureStep, GroceryFeatureStep (post-demo
//   showcases), AgeStep (personalize), and the ceremony screens SocialProofStep,
//   GoalsAffirmationStep ("92% of cooks"), SourcesAffirmationStep,
//   PersonalizeAffirmationStep (cut to shorten the flow).
import SignatureDishStep from "@/components/onboarding/SignatureDishStep";
import DinnerRankingStep from "@/components/onboarding/DinnerRankingStep";
import TasteProfileOverlay from "@/components/onboarding/TasteProfileOverlay";
import HowDidYouHearStep from "@/components/onboarding/guided/HowDidYouHearStep";
import PlusUpsell from "@/components/onboarding/paywall/PlusUpsell";
import { purchasePlus } from "@/lib/purchases";
import { invalidateEntitlement } from "@/lib/useEntitlement";
import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

// Soft paywall OFF for now: the post–Taste DNA Plus upsell is parked, not part
// of the live flow — the reveal lands users straight in the app. The paywall
// screens (PlusUpsell, etc.) are kept in the codebase; flip this back to true
// to re-enable the upsell once billing (RevenueCat, Phase 2) is wired up.
const PAYWALL_ENABLED = false;

// Step map (ReciMe-style guided flow). Questions run post-signup (account
// creation follows the feature tour); every screen either collects something
// real, demos something real, or is the payoff — the ceremony screens were cut.
// Safety questions (allergies + dietary flag) come right after the goal arc;
// the ranking flows straight into the reveal; household closes the show:
//   0  Goals — what are your goals? (guided)
//   1  Meal count — how many meals/week (sets cooking goal) (guided)
//   2  Goal reinforcement — animated graph, "stick with it" (guided)
//   3  Allergies (guided)
//   4  Dietary flag splash — "we'll flag what doesn't fit" (guided)
//   5  Recipe sources — where do you get your recipes? (guided)
//   6  Add to your cookbook — paste links / photos, saves to account (guided)
//   7  Guided first-run — recipe saved → meal-plan demo → grocery demo (guided chrome)
//   8  Made for you — personalization pillars: taste, household, friends (guided)
//   9  Dream meal / signature dish (guided)
//   10 Dinner ranking — recipe picker (guided)
//   11 Taste profile reveal — straight after the ranking that feeds it (guided)
//   12 Notifications — keep your streak alive (guided, post-payoff ask)
//   13 How did you hear about us? — attribution (guided)
//   14 Create a household — the finale, lands in the app (guided)
const PROFILE_STEP = 11;
const NOTIFICATIONS_STEP = 12;
const REFERRAL_STEP = 13;
const HOUSEHOLD_STEP = 14;
const PAYWALL_STEP = 15;
const TOTAL_STEPS = PAYWALL_ENABLED ? 16 : 15;
const STORAGE_KEY = "marco_onboarding";

interface OnboardingState {
  goals: string[];
  referralSource: string;
  recipeSources: string[];
  planTiming: string;
  weeklyMealGoal: number;
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
  referralSource: "",
  recipeSources: [],
  planTiming: "",
  weeklyMealGoal: 0,
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
  // Lowest step the user may navigate back to. Raised when the intro questions
  // (goals / meals / graph) were answered before signup, so Back doesn't walk
  // them into the skipped screens.
  const minStepRef = useRef(0);

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
      let restoredWeeklyGoal = 0;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.data) {
            setData({ ...defaultState, ...parsed.data, rankedRecipes: parsed.data.rankedRecipes || [], importedRecipes: parsed.data.importedRecipes || [] });
            restoredWeeklyGoal = parsed.data.weeklyMealGoal || 0;
          }
        }
      } catch { /* ignore */ }

      // Legacy: if the user answered the intro questions back when they ran
      // before signup (goals / meals + graph / recipe sources), resume at
      // allergies (step 3) — the first thing they haven't answered. They'll
      // see sources once more (pre-filled) since it now follows allergies.
      let preAuthDone = false;
      try { preAuthDone = localStorage.getItem("marco_preauth_done") === "1"; } catch { /* ignore */ }
      if (preAuthDone) {
        minStepRef.current = 3;
        setStep(3);
        // MealCountStep normally persists the weekly goal; we skipped it, so do
        // it here now that the user is authenticated (fire-and-forget).
        if (restoredWeeklyGoal > 0) {
          fetch("/api/cooking-goal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weekly_target: restoredWeeklyGoal }),
          }).catch(() => { /* non-blocking */ });
        }
      }

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
  const goBack = useCallback(() => setStep((prev) => Math.max(prev - 1, minStepRef.current)), []);

  const update = useCallback((partial: Partial<OnboardingState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  // Persist the weekly cooking goal as the user picks it (fire-and-forget) so it
  // flows into the same cooking_goals system the profile + gamification use.
  const saveWeeklyGoal = useCallback((weekly_target: number) => {
    fetch("/api/cooking-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekly_target }),
    }).catch(() => { /* non-blocking */ });
  }, []);

  // The attribution answer arrives AFTER the reveal has already saved everything
  // via /api/onboarding — so it gets its own targeted merge (fire-and-forget;
  // never blocks the flow).
  const saveReferral = useCallback((referralSource: string) => {
    fetch("/api/onboarding/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralSource }),
    }).catch(() => { /* non-blocking */ });
  }, []);

  // Same deal for household size/type: the household step is now the finale
  // (post-reveal), so its preference fields get a targeted save. The household
  // itself is created/joined by the step's own /api/household calls.
  const saveHouseholdPrefs = useCallback((householdSize: number, householdType: string | null) => {
    fetch("/api/onboarding/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdSize, householdType }),
    }).catch(() => { /* non-blocking */ });
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
    try { localStorage.removeItem("marco_preauth_done"); } catch { /* ignore */ }
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
        <GoalsStep
          step={1}
          totalSteps={TOTAL_STEPS}
          value={data.goals}
          onBack={() => router.push("/auth/signup")}
          onNext={(goals) => { update({ goals }); goForward(); }}
        />
      );
    case 1:
      return (
        <MealCountStep
          step={2}
          totalSteps={TOTAL_STEPS}
          value={data.weeklyMealGoal}
          onBack={goBack}
          onNext={(count) => { update({ weeklyMealGoal: count }); saveWeeklyGoal(count); goForward(); }}
        />
      );
    case 2:
      return (
        <GoalReinforcementStep
          step={3}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 3:
      return (
        <AllergiesStep
          value={data.allergies}
          step={4}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(allergies) => { update({ allergies }); goForward(); }}
        />
      );
    case 4:
      return (
        <DietaryFlagStep
          allergies={data.allergies}
          step={5}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 5:
      return (
        <RecipeSourcesStep
          step={6}
          totalSteps={TOTAL_STEPS}
          value={data.recipeSources}
          onBack={goBack}
          onNext={(recipeSources) => { update({ recipeSources }); goForward(); }}
        />
      );
    case 6:
      return (
        <RecipeImportStep
          step={7}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(recipes) => { update({ importedRecipes: recipes }); goForward(); }}
        />
      );
    case 7:
      return (
        <GuidedDemo
          recipes={data.importedRecipes}
          step={8}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onComplete={goForward}
        />
      );
    case 8:
      return (
        <MadeForYouStep
          step={9}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onContinue={goForward}
        />
      );
    case 9:
      return (
        <SignatureDishStep
          value={data.signatureDish}
          step={10}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onNext={(dish) => { update({ signatureDish: dish }); goForward(); }}
        />
      );
    case 10:
      return (
        <DinnerRankingStep
          step={11}
          totalSteps={TOTAL_STEPS}
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
          step={12}
          totalSteps={TOTAL_STEPS}
          onBack={goBack}
          onComplete={handleComplete}
          // Always hand off after the reveal — notifications ride the payoff
          // moment, then attribution, then household closes the show (and,
          // when re-enabled, the paywall after that).
          onShowPaywall={goForward}
        />
      );
    case NOTIFICATIONS_STEP:
      // No onBack — onboarding is already saved/complete once the reveal ends.
      return (
        <NotificationsStep
          step={13}
          totalSteps={TOTAL_STEPS}
          onContinue={goForward}
        />
      );
    case REFERRAL_STEP:
      return (
        <HowDidYouHearStep
          step={14}
          totalSteps={TOTAL_STEPS}
          value={data.referralSource}
          onNext={(referralSource) => {
            update({ referralSource });
            saveReferral(referralSource);
            goForward();
          }}
        />
      );
    case HOUSEHOLD_STEP:
      // The finale. Household create/join happens via the step's own API calls;
      // size/type get a targeted post-completion save (the reveal already wrote
      // the main payload). No onBack — everything before is saved and done.
      return (
        <CreateHouseholdStep
          size={data.householdSize}
          type={data.householdType}
          step={15}
          totalSteps={TOTAL_STEPS}
          onComplete={(joined, size, type) => {
            update({ joinedHousehold: joined, householdSize: size, householdType: type });
            saveHouseholdPrefs(size, type);
            if (PAYWALL_ENABLED) goForward();
            else landInApp();
          }}
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
