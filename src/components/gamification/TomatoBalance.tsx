"use client";

import { TomatoIcon } from "@/components/icons/HandDrawnIcons";

interface TomatoBalanceProps {
  balance: number;
  className?: string;
  size?: "sm" | "md";
}

export default function TomatoBalance({ balance, className = "", size = "md" }: TomatoBalanceProps) {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <TomatoIcon className={`${iconSize} text-red-500`} filled />
      <span className={`font-bold ${textSize}`}>{balance}</span>
    </div>
  );
}
