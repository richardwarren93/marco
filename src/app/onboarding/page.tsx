"use client";

// Onboarding = the in-kitchen walkthrough (KitchenOnboarding). Signup, the auth
// callback, and middleware all route first-run users here, so this one swap makes
// the new kitchen-native onboarding the real front door. The old ReciMe funnel
// components stay in the codebase (unused) for reference / easy rollback.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import KitchenOnboarding from "@/components/kitchen/KitchenOnboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.onboarding_completed) {
        document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
        router.replace("/tonight");
        return;
      }
      setReady(true);
    });
  }, [router]);

  const handleComplete = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
      }
    } catch {
      /* non-blocking — the essentials already saved as we went */
    }
    document.cookie = "marco_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
    router.replace("/tonight");
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "#A9683A" }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "#E5462E", animation: `pulse-soft 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  return <KitchenOnboarding onComplete={handleComplete} />;
}
