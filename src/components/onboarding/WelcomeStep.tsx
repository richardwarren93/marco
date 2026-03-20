"use client";

import Image from "next/image";

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-[slide-up_0.4s_ease-out]">
      <Image
        src="/marco-icon.svg"
        alt="Marco"
        width={120}
        height={120}
        className="mb-6"
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Welcome to Marco!
      </h1>

      <p className="text-gray-500 text-lg mb-8 max-w-sm">
        Save recipes from anywhere, plan your meals, and cook with friends.
      </p>

      <div className="space-y-3 text-left w-full max-w-xs mb-10">
        {[
          { icon: "🔗", text: "Import from Instagram, TikTok & any URL" },
          { icon: "📅", text: "Plan your weekly meals with a calendar" },
          { icon: "🛒", text: "Auto-generate grocery lists" },
          { icon: "👨‍👩‍👧", text: "Share with your household" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <span className="text-gray-700 text-sm">{item.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-xs bg-orange-600 text-white font-semibold py-3.5 rounded-xl hover:bg-orange-700 transition-colors text-lg"
      >
        Let&apos;s go!
      </button>
    </div>
  );
}
