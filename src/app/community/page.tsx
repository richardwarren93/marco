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
    <div className="flex flex-col min-h-screen" style={{ background: "#faf9f7" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors -ml-1"
              style={{ background: "rgba(0,0,0,0.05)" }}
            >
              <svg className="w-4 h-4" style={{ color: "#1a1410" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>Community</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>Discover & connect</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex rounded-xl p-1 max-w-[280px] mx-auto" style={{ background: "rgba(0,0,0,0.05)" }}>
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
                    ? "bg-white shadow-sm"
                    : "hover:opacity-80"
                }`}
                style={{
                  color: activeTab === tab.key ? "#1a1410" : "#a09890",
                }}
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
        <div className="max-w-2xl mx-auto">
          {activeTab === "join" && <JoinTab />}
          {activeTab === "playlists" && <PlaylistsTab />}
        </div>
      </div>
    </div>
  );
}
