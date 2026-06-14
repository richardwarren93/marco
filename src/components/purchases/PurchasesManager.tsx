"use client";

// Configures RevenueCat once the user is known and re-binds on every sign-in,
// so the customer's RevenueCat app_user_id always equals their Supabase user id
// (the webhook relies on that mapping). On web this is a no-op — configurePurchases
// returns false off-device. Mirrors PushNotificationManager's lifecycle.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { configurePurchases } from "@/lib/purchases";

export default function PurchasesManager() {
  const boundUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function bind(userId: string | undefined) {
      if (!userId || cancelled || boundUserId.current === userId) return;
      const ok = await configurePurchases(userId);
      if (ok && !cancelled) boundUserId.current = userId;
    }

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => bind(user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: string, session: { user?: { id: string } } | null) => {
        if (session?.user) bind(session.user.id);
        else boundUserId.current = null;
      }
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
