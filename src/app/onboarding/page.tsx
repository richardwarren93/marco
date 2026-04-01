"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import MotivationStep from "@/components/onboarding/MotivationStep";
import PriorityStep from "@/components/onboarding/PriorityStep";
import MealsPerWeekStep from "@/components/onboarding/MealsPerWeekStep";
import HouseholdStep from "@/components/onboarding/HouseholdStep";
import AllergiesStep from "@/components/onboarding/AllergiesStep";
import AutoDemoStep from "@/components/onboarding/AutoDemoStep";
import DinnerRankingStep from "@/components/onboarding/DinnerRankingStep";
import TasteProfileOverlay from "@/components/onboarding/TasteProfileOverlay";
import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

const TOTAL_STEPS = 8;
const STORAGE_KEY = "marco_onboarding";

interface OnboardingState {
  motivation: string | null;
  priority: string | null;
  mealsPerWeek: string | null;
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
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown } }) => {
      if (!user) { router.replace("/auth/login"); return; }
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.step !== undefined) setStep(parsed.step);
          if (parsed.data) {
            // Restore but handle rankedRecipes carefully (may not serialize well)
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
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
      } catch { /* ignore */ }
    }
  }, [step, data, ready]);

  const goForward = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const update = useCallback((partial: Partial<OnboardingState>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleComplete = useCallback(async () => {
    try {
      const payload = { ...data };
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* continue anyway */ }
    sessionStorage.removeItem(STORAGE_KEY);
  }, [data]);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "#faf9f7" }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "#ea580c", animation: `pulse-soft 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // Steps 0-6 render inside OnboardingShell, step 7 (profile) is a full overlay
  if (step === 7) {
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
        return <HouseholdStep size={data.householdSize} type={data.householdType} onNext={(size, type) => { update({ householdSize: size, householdType: type }); goForward(); }} />;
      case 4:
        return <AllergiesStep value={data.allergies} onNext={(allergies) => { update({ allergies }); goForward(); }} />;
      case 5:
        return <AutoDemoStep onNext={goForward} />;
      case 6:
        return (
          <DinnerRankingStep
            onNext={(rankedIds, rankedRecipes, signatureDish) => {
              update({ rankedIds, rankedRecipes, signatureDish });
              goForward();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <OnboardingShell step={step} totalSteps={TOTAL_STEPS} direction={direction} onBack={goBack} hideBack={step === 0 || step === 5}>
      {renderStep()}
    </OnboardingShell>
  );
}
