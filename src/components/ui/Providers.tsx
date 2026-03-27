"use client";

import { SWRConfig } from "swr";
import { ToastProvider } from "./Toast";
import BadgeChecker from "@/components/gamification/BadgeChecker";

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
        {children}
      </ToastProvider>
    </SWRConfig>
  );
}
