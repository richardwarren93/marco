"use client";

import { SWRConfig } from "swr";
import { ToastProvider } from "./Toast";
import BadgeChecker from "@/components/gamification/BadgeChecker";
import PushNotificationManager from "@/components/push/PushNotificationManager";
import PurchasesManager from "@/components/purchases/PurchasesManager";
import DeepLinkHandler from "@/components/native/DeepLinkHandler";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        fetcher: (url: string) => fetch(url).then((r) => r.json()),
      }}
    >
      <ToastProvider>
        <BadgeChecker />
        <PushNotificationManager />
        <PurchasesManager />
        <DeepLinkHandler />
        {children}
      </ToastProvider>
    </SWRConfig>
  );
}
