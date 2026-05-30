"use client";

// PRESERVED, NOT IN THE FLOW. The motivation question was cut from onboarding
// (it overlapped with other goal questions and added little data value), but
// the cookbook look + dual-polaroid scrapbook composition is kept here in case
// we want to reuse it later. Wire it back into onboarding/page.tsx to use.

import { useState } from "react";
import CookbookPage from "./CookbookPage";
import { DualPolaroid } from "./CookbookOrnaments";
import { CookbookButton, CookbookOptionCard } from "./CookbookControls";
import {
  SearchIcon,
  SaveRecipeIcon,
  MealPlanIcon,
  GroceryIcon,
} from "@/components/icons/HandDrawnIcons";

const OPTIONS = [
  { id: "find_recipes", label: "Find new recipes", Icon: SearchIcon },
  { id: "save_recipes", label: "Save all my recipes in one place", Icon: SaveRecipeIcon },
  { id: "meal_plans", label: "Build meal plans easily", Icon: MealPlanIcon },
  { id: "grocery_shopping", label: "Save time grocery shopping", Icon: GroceryIcon },
];

interface Props {
  value: string | null;
  pageNumber: number;
  onBack?: () => void;
  onNext: (motivation: string) => void;
}

export default function MotivationStep({ value, pageNumber, onBack, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(value);

  return (
    <CookbookPage
      sectionLabel="Welcome"
      questionLabel="Your goal"
      timeLabel="~2 Min"
      dropCap="W"
      title={
        <>
          hat brings you{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>here?</em>
        </>
      }
      subtitle="This helps us personalize your experience."
      pageNumber={pageNumber}
      onBack={onBack}
      footer={
        <CookbookButton onClick={() => selected && onNext(selected)} disabled={!selected}>
          Continue
        </CookbookButton>
      }
    >
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((opt, i) => (
          <CookbookOptionCard
            key={opt.id}
            label={opt.label}
            icon={<opt.Icon className="w-6 h-6" />}
            selected={selected === opt.id}
            onClick={() => setSelected(opt.id)}
            delay={0.65 + i * 0.07}
          />
        ))}
      </div>

      {/* Dual-polaroid composition — Grandma's story. Cook + dish photos
          layered like a scrapbook spread, in vintage treatment. */}
      <div
        className="relative h-[300px] mt-5 -mx-3 flex-shrink-0"
        style={{ animation: "cookbook-polaroid-place 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.95s both" }}
      >
        <div className="absolute" style={{ bottom: 4, left: -8 }}>
          <DualPolaroid
            src="/marketing/grandma cooking when young.png"
            caption={null}
            width={200}
            aspectRatio="4 / 5"
            rotation={-3}
            tapeOffset={38}
            tapeRotation={-6}
            grayscale
          />
        </div>
        <div className="absolute" style={{ bottom: 18, right: -12 }}>
          <DualPolaroid
            src="/marketing/Tomato basil pasta.png"
            caption="tomato basil pasta ♥"
            width={185}
            aspectRatio="1 / 1"
            rotation={7}
            tapeOffset={42}
            tapeRotation={10}
          />
        </div>
      </div>
    </CookbookPage>
  );
}
