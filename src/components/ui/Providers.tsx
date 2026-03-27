"use client";

import { ToastProvider } from "./Toast";
import BadgeChecker from "@/components/gamification/BadgeChecker";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <BadgeChecker />
      {children}
    </ToastProvider>
  );
}
