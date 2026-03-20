"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/components/onboarding/ProgressBar";
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import GoalsStep from "@/components/onboarding/GoalsStep";
import CookingFrequencyStep from "@/components/onboarding/CookingFrequencyStep";
import DietStep from "@/components/onboarding/DietStep";
import AttributionStep from "@/components/onboarding/AttributionStep";

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Onboarding data
  const [goals, setGoals] = useState<string[]>([]);
  const [cookingFrequency, setCookingFrequency] = useState(0);
  const [diet, setDiet] = useState("");
  const [referralSource, setReferralSource] = useState("");

  async function handleFinish() {
    setSaving(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooking_goals: goals,
          weekly_cooking_goal: cookingFrequency,
          diet_preference: diet,
          referral_source: referralSource,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding save error:", err);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-2 max-w-md mx-auto w-full">
        <ProgressBar step={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-md mx-auto w-full py-4">
        {step === 0 && (
          <WelcomeStep onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <GoalsStep
            selected={goals}
            onChange={setGoals}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <CookingFrequencyStep
            selected={cookingFrequency}
            onChange={setCookingFrequency}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <DietStep
            selected={diet}
            onChange={setDiet}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <AttributionStep
            selected={referralSource}
            onChange={setReferralSource}
            onFinish={handleFinish}
            onBack={() => setStep(3)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
