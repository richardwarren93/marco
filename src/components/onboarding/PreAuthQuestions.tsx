"use client";

import { useState } from "react";
import GoalsStep from "@/components/onboarding/guided/GoalsStep";
import MealCountStep from "@/components/onboarding/guided/MealCountStep";
import GoalReinforcementStep from "@/components/onboarding/guided/GoalReinforcementStep";
import RecipeSourcesStep from "@/components/onboarding/guided/RecipeSourcesStep";

/**
 * PARKED — no longer mounted. Account creation now follows the feature tour
 * directly, so these intro questions (goals → meals-per-week → goal graph →
 * recipe sources) run post-signup inside /onboarding instead, which already
 * contains all of them. Kept for an easy bring-back if we want pre-signup
 * questions again: it persists answers to `marco_onboarding` localStorage and
 * sets `marco_preauth_done`, which /onboarding still honours by skipping its
 * duplicate steps. ("How did you hear about us?" lives at the very end of
 * onboarding now.)
 */
const STORAGE_KEY = "marco_onboarding";
const PREAUTH_FLAG = "marco_preauth_done";
const TOTAL = 5; // 4 questions + account creation — keeps the progress bar honest.

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
  const [goals, setGoals] = useState<string[]>([]);
  const [meals, setMeals] = useState(0);
  const [recipeSources, setRecipeSources] = useState<string[]>([]);

  const back = () => (sub === 0 ? onBack() : setSub((s) => s - 1));

  if (sub === 0) {
    return (
      <GoalsStep
        step={1}
        totalSteps={TOTAL}
        value={goals}
        onBack={back}
        onNext={(g) => { setGoals(g); persist({ goals: g }); setSub(1); }}
      />
    );
  }

  if (sub === 1) {
    return (
      <MealCountStep
        step={2}
        totalSteps={TOTAL}
        value={meals}
        onBack={back}
        onNext={(m) => { setMeals(m); persist({ weeklyMealGoal: m }); setSub(2); }}
      />
    );
  }

  if (sub === 2) {
    return (
      <GoalReinforcementStep
        step={3}
        totalSteps={TOTAL}
        onBack={back}
        onContinue={() => setSub(3)}
      />
    );
  }

  return (
    <RecipeSourcesStep
      step={4}
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
