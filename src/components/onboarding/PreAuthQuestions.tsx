"use client";

import { useState } from "react";
import HowDidYouHearStep from "@/components/onboarding/guided/HowDidYouHearStep";
import GoalsStep from "@/components/onboarding/guided/GoalsStep";
import MealCountStep from "@/components/onboarding/guided/MealCountStep";
import GoalReinforcementStep from "@/components/onboarding/guided/GoalReinforcementStep";
import RecipeSourcesStep from "@/components/onboarding/guided/RecipeSourcesStep";

/**
 * The intro questions shown after the feature tour and before account creation:
 * how-they-heard → goals → meals-per-week → the goal-adherence graph → where do
 * you get your recipes. Answers are written to the same `marco_onboarding`
 * localStorage the post-signup flow restores, and a flag tells that flow to skip
 * these steps so nothing repeats. Account creation (sign in) comes last.
 */
const STORAGE_KEY = "marco_onboarding";
const PREAUTH_FLAG = "marco_preauth_done";
const TOTAL = 6; // 5 questions + account creation — keeps the progress bar honest.

function persist(partial: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cur = raw ? JSON.parse(raw) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, data: { ...(cur.data || {}), ...partial } }));
  } catch {
    /* ignore */
  }
}

export default function PreAuthQuestions({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [sub, setSub] = useState(0);
  const [referral, setReferral] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [meals, setMeals] = useState(0);
  const [recipeSources, setRecipeSources] = useState<string[]>([]);

  const back = () => (sub === 0 ? onBack() : setSub((s) => s - 1));

  if (sub === 0) {
    return (
      <HowDidYouHearStep
        step={1}
        totalSteps={TOTAL}
        value={referral}
        onBack={back}
        onNext={(r) => { setReferral(r); persist({ referralSource: r }); setSub(1); }}
      />
    );
  }

  if (sub === 1) {
    return (
      <GoalsStep
        step={2}
        totalSteps={TOTAL}
        value={goals}
        onBack={back}
        onNext={(g) => { setGoals(g); persist({ goals: g }); setSub(2); }}
      />
    );
  }

  if (sub === 2) {
    return (
      <MealCountStep
        step={3}
        totalSteps={TOTAL}
        value={meals}
        onBack={back}
        onNext={(m) => { setMeals(m); persist({ weeklyMealGoal: m }); setSub(3); }}
      />
    );
  }

  if (sub === 3) {
    return (
      <GoalReinforcementStep
        step={4}
        totalSteps={TOTAL}
        onBack={back}
        onContinue={() => setSub(4)}
      />
    );
  }

  return (
    <RecipeSourcesStep
      step={5}
      totalSteps={TOTAL}
      value={recipeSources}
      onBack={back}
      onNext={(sources) => {
        setRecipeSources(sources);
        persist({ recipeSources: sources });
        try { localStorage.setItem(PREAUTH_FLAG, "1"); } catch { /* ignore */ }
        onComplete();
      }}
    />
  );
}
