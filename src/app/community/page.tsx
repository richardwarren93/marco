"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import JoinTab from "@/components/community/JoinTab";
import PlaylistsTab from "@/components/community/PlaylistsTab";

type Tab = "join" | "playlists";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("join");
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors -ml-1"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Community</h1>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex bg-gray-100 rounded-xl p-1 max-w-[280px] mx-auto">
            {(
              [
                { key: "playlists" as Tab, label: "Playlists", icon: "🎵" },
                { key: "join" as Tab, label: "Join", icon: "🫂" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {activeTab === "join" && <JoinTab />}
          {activeTab === "playlists" && <PlaylistsTab />}
        </div>
      </div>
    </div>
  );
}
