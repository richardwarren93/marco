"use client";

import { useState } from "react";
import PetSvg from "./PetSvg";
import TomatoBalance from "./TomatoBalance";
import type { UserPet } from "@/types";
import { TOMATO_REWARDS } from "@/lib/gamification";

interface PetWidgetProps {
  pet: UserPet;
  tomatoBalance: number;
  onFed?: (newPet: UserPet, newBalance: number) => void;
}

const moodLabels: Record<string, string> = {
  happy: "Feeling great!",
  content: "Doing well",
  hungry: "Getting hungry...",
  sad: "Needs attention",
  very_sad: "Please feed me!",
};

export default function PetWidget({ pet, tomatoBalance, onFed }: PetWidgetProps) {
  const [feeding, setFeeding] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  const mood = pet.mood || "content";
  const canFeed = tomatoBalance >= TOMATO_REWARDS.FEED_PET_COST;

  async function handleFeed() {
    if (feeding || !canFeed) return;
    setFeeding(true);

    try {
      const res = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to feed");
      const data = await res.json();

      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);

      onFed?.(data.pet, data.tomatoBalance);
    } catch (error) {
      console.error("Feed pet error:", error);
    } finally {
      setFeeding(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
      {/* Pet SVG */}
      <div className={bouncing ? "animate-bounce-pet" : ""}>
        <PetSvg mood={mood} className="w-20 h-20 sm:w-24 sm:h-24" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm">{pet.name}</h3>
          <TomatoBalance balance={tomatoBalance} size="sm" />
        </div>
        <p className="text-xs text-gray-500 mb-2">{moodLabels[mood]}</p>

        <button
          onClick={handleFeed}
          disabled={feeding || !canFeed}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
            canFeed
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {feeding ? "Feeding..." : `Feed (${TOMATO_REWARDS.FEED_PET_COST} 🍅)`}
        </button>
      </div>
    </div>
  );
}
