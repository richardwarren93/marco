"use client";

import { SWRConfig, mutate } from "swr";
import { MotionConfig } from "motion/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider } from "./Toast";
import BadgeChecker from "@/components/gamification/BadgeChecker";
import PushNotificationManager from "@/components/push/PushNotificationManager";
import PurchasesManager from "@/components/purchases/PurchasesManager";
import PendingInvites from "@/components/people/PendingInvites";

export default function Providers({ children }: { children: React.ReactNode }) {
  const identity = useRef<string | null>(null);
  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const next = session?.user.id ?? "signed-out";
      if (identity.current !== null && identity.current !== next) void mutate(() => true, undefined, { revalidate: false });
      identity.current = next;
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        fetcher: (url: string) => fetch(url).then((r) => r.json()),
      }}
    >
      {/* Every Motion animation honours the phone's Reduce Motion setting. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <BadgeChecker />
          <PendingInvites />
          <PushNotificationManager />
          <PurchasesManager />
          {children}
        </ToastProvider>
      </MotionConfig>
    </SWRConfig>
  );
}
