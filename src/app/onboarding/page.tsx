"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import MotivationStep from "@/components/onboarding/MotivationStep";
import PriorityStep from "@/components/onboarding/PriorityStep";
import MealsPerWeekStep from "@/components/onboarding/MealsPerWeekStep";
import JoinHouseholdStep from "@/components/onboarding/JoinHouseholdStep";
import HouseholdStep from "@/components/onboarding/HouseholdStep";
import AllergiesStep from "@/components/onboarding/AllergiesStep";
import AutoDemoStep from "@/components/onboarding/AutoDemoStep";
import SignatureDishStep from "@/components/onboarding/SignatureDishStep";
import DinnerRankingStep from "@/components/onboarding/DinnerRankingStep";
import TasteProfileOverlay from "@/components/onboarding/TasteProfileOverlay";
import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

const TOTAL_STEPS = 10;
const STORAGE_KEY = "marco_onboarding";

interface OnboardingState {
  motivation: string | null;
  priority: string | null;
  mealsPerWeek: string | null;
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
  motivation: null,
  priority: null,
  mealsPerWeek: null,
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
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [data, setData] = useState<OnboardingState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (!user) { router.replace("/auth/login"); return; }

      // Check if onboarding already completed — redirect to app
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.replace("/recipes");
        return;
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.step !== undefined) setStep(parsed.step);
          if (parsed.data) {
            setData({ ...defaultState, ...parsed.data, rankedRecipes: parsed.data.rankedRecipes || [] });
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

  const goTo = useCallback((target: number) => {
    setDirection("forward");
    setStep(target);
  }, []);

  const goForward = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setStep((prev) => {
      // If on HouseholdStep (4) and they joined a household, skip back to JoinHouseholdStep (3)
      // If on AllergiesStep (5) and they joined a household, skip back past HouseholdStep to JoinHouseholdStep
      if (prev === 5 && data.joinedHousehold) return 3;
      return Math.max(prev - 1, 0);
    });
  }, [data.joinedHousehold]);

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
      // Set cookie so middleware knows onboarding is done
      document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
    } catch { /* continue anyway */ }
    localStorage.removeItem(STORAGE_KEY);
  }, [data]);

  if (!ready) {
    return (
      <div className="max-w-2xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "#ea580c", animation: `pulse-soft 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // Step 9 (profile) is a full overlay outside OnboardingShell
  if (step === 9) {
    return (
      <TasteProfileOverlay
        rankedIds={data.rankedIds}
        rankedRecipes={data.rankedRecipes}
        signatureDish={data.signatureDish}
        onComplete={handleComplete}
      />
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return <MotivationStep value={data.motivation} onNext={(motivation) => { update({ motivation }); goForward(); }} />;
      case 1:
        return <PriorityStep value={data.priority} onNext={(priority) => { update({ priority }); goForward(); }} />;
      case 2:
        return <MealsPerWeekStep value={data.mealsPerWeek} onNext={(meals) => { update({ mealsPerWeek: meals }); goForward(); }} />;
      case 3:
        // Join household step - before household size
        return (
          <JoinHouseholdStep
            onJoin={() => {
              // They joined an existing household → skip the size/type question
              update({ joinedHousehold: true });
              goTo(5); // Jump to AllergiesStep
            }}
            onCreateNew={() => {
              // They want to create new → go to household size step
              update({ joinedHousehold: false });
              goForward(); // Go to step 4 (HouseholdStep)
            }}
          />
        );
      case 4:
        // Household size/type - only shown if creating new
        return <HouseholdStep size={data.householdSize} type={data.householdType} onNext={(size, type) => { update({ householdSize: size, householdType: type }); goForward(); }} />;
      case 5:
        return <AllergiesStep value={data.allergies} onNext={(allergies) => { update({ allergies }); goForward(); }} />;
      case 6:
        return <AutoDemoStep onNext={goForward} />;
      case 7:
        return (
          <SignatureDishStep
            value={data.signatureDish}
            onNext={(dish) => { update({ signatureDish: dish }); goForward(); }}
          />
        );
      case 8:
        return (
          <DinnerRankingStep
            onNext={(rankedIds, rankedRecipes) => {
              update({ rankedIds, rankedRecipes });
              goForward();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <OnboardingShell step={step} totalSteps={TOTAL_STEPS} direction={direction} onBack={goBack} hideBack={step === 0 || step === 6 || step === 8}>
      {renderStep()}
    </OnboardingShell>
  );
}
