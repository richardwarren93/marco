"use client";

// Orchestrates the 4-screen Marco Plus upsell that runs right after the Taste
// DNA reveal: hook → compare → trial reminder → paywall. Skippable at any point
// (soft paywall). Phase 0 is presentation-only — onStartTrial/onSkip are where
// Phase 2 will wire RevenueCat and the entitlement write; for now both just
// hand control back so onboarding can finish into /recipes.

import { useState } from "react";
import PlusHookScreen from "./PlusHookScreen";
import PlusCompareScreen from "./PlusCompareScreen";
import TrialReminderScreen from "./TrialReminderScreen";
import PlusPaywallScreen from "./PlusPaywallScreen";

type Screen = "hook" | "compare" | "reminder" | "paywall";

interface Props {
  /** User chose a plan and tapped "Start for $0.00". Phase 2: trigger the
   *  StoreKit purchase here before resolving. */
  onStartTrial: (plan: "annual" | "monthly", remind: boolean) => void;
  /** User dismissed the offer — continue to the app on the free tier. */
  onSkip: () => void;
}

export default function PlusUpsell({ onStartTrial, onSkip }: Props) {
  const [screen, setScreen] = useState<Screen>("hook");

  switch (screen) {
    case "hook":
      return <PlusHookScreen onContinue={() => setScreen("compare")} onClose={onSkip} />;
    case "compare":
      return (
        <PlusCompareScreen
          onContinue={() => setScreen("reminder")}
          onBack={() => setScreen("hook")}
          onClose={onSkip}
        />
      );
    case "reminder":
      return (
        <TrialReminderScreen
          onContinue={() => setScreen("paywall")}
          onBack={() => setScreen("compare")}
          onClose={onSkip}
        />
      );
    case "paywall":
      return (
        <PlusPaywallScreen
          onStartTrial={onStartTrial}
          onSkip={onSkip}
          onBack={() => setScreen("reminder")}
        />
      );
    default:
      return null;
  }
}
