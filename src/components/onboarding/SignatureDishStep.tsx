"use client";

import { useState, useRef } from "react";
import CookbookPage from "./cookbook/CookbookPage";
import { CookbookButton } from "./cookbook/CookbookControls";

interface Props {
  value: string;
  pageNumber: number;
  onBack?: () => void;
  onNext: (dish: string) => void;
}

export default function SignatureDishStep({ value, pageNumber, onBack, onNext }: Props) {
  const [dish, setDish] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <CookbookPage
      sectionLabel="Your taste"
      questionLabel="Dream meal"
      dropCap="W"
      title={
        <>
          hat&apos;s your{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>dream meal?</em>
        </>
      }
      subtitle="If you could eat one meal for the rest of your life, what would it be?"
      pageNumber={pageNumber}
      onBack={onBack}
      footer={
        <CookbookButton onClick={() => onNext(dish)} disabled={!dish.trim()}>
          Continue
        </CookbookButton>
      }
    >
      <div className="flex flex-col items-center justify-center h-full py-6">
        <div className="text-5xl mb-6">👨‍🍳</div>
        <input
          ref={inputRef}
          type="text"
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          onFocus={() => {
            setTimeout(() => {
              inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }}
          placeholder="e.g. Grandma's lasagna, Thai green curry..."
          className="w-full px-5 py-4 rounded-2xl outline-none text-center"
          style={{
            background: "rgba(255, 253, 247, 0.7)",
            border: "1px solid rgba(28, 26, 23, 0.18)",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "16px",
            color: "#1C1A17",
            scrollMarginBottom: "120px",
          }}
        />
        <p
          className="mt-4 text-center"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            fontSize: "13px",
            color: "rgba(28, 26, 23, 0.5)",
          }}
        >
          This will appear on your Taste DNA profile
        </p>
      </div>
    </CookbookPage>
  );
}
