"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import DiscoverToggle, { type DiscoverTab as ToggleTab } from "./discover/DiscoverToggle";
import FriendsFeed from "./discover/FriendsFeed";
import CommunityFeed from "./discover/CommunityFeed";

// ─── Context menu types ─────────────────────────────────────────────────────

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  recipeId: string;
  recipeTitle: string;
}

const STORAGE_KEY = "marco:discover-tab";

// ─── Main component ─────────────────────────────────────────────────────────

export default function DiscoverTab({
  onAddToMealPlan,
  onAddToCollection,
}: {
  onAddToMealPlan?: (recipeId: string) => void;
  onAddToCollection?: (recipeId: string) => void;
}) {
  const router = useRouter();

  // Toggle state — defaults to Friends, remembers last choice in localStorage.
  const [active, setActive] = useState<ToggleTab>("friends");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "friends" || stored === "community") {
        setActive(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleTabChange = useCallback((tab: ToggleTab) => {
    setActive(tab);
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  }, []);

  // Context menu state (long-press / right-click) — shared across both feeds.
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    recipeId: "",
    recipeTitle: "",
  });
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    if (!ctxMenu.visible) return;
    function close() {
      setCtxMenu((prev) => ({ ...prev, visible: false }));
    }
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu.visible]);

  const openCtxMenu = useCallback(
    (x: number, y: number, recipeId: string, recipeTitle: string) => {
      const menuW = 180,
        menuH = 100;
      const cx = Math.min(x, window.innerWidth - menuW - 8);
      const cy = Math.min(y, window.innerHeight - menuH - 8);
      setCtxMenu({ visible: true, x: cx, y: cy, recipeId, recipeTitle });
    },
    []
  );

  const startLongPress = useCallback(
    (recipeId: string, recipeTitle: string) => (e: React.TouchEvent) => {
      longPressTriggered.current = false;
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        if (navigator.vibrate) navigator.vibrate(30);
        openCtxMenu(x, y, recipeId, recipeTitle);
      }, 500);
    },
    [openCtxMenu]
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleRightClick = useCallback(
    (recipeId: string, recipeTitle: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      openCtxMenu(e.clientX, e.clientY, recipeId, recipeTitle);
    },
    [openCtxMenu]
  );

  const handleCtxSave = useCallback(() => {
    const { recipeId } = ctxMenu;
    setCtxMenu((prev) => ({ ...prev, visible: false }));
    onAddToCollection?.(recipeId);
  }, [ctxMenu, onAddToCollection]);

  const handleCtxPlan = useCallback(() => {
    const { recipeId } = ctxMenu;
    setCtxMenu((prev) => ({ ...prev, visible: false }));
    onAddToMealPlan?.(recipeId);
  }, [ctxMenu, onAddToMealPlan]);

  const handleTap = useCallback(
    (recipeId: string) => {
      if (longPressTriggered.current) return;
      router.push(`/recipes/${recipeId}`);
    },
    [router]
  );

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-5"
      style={{
        background: "var(--cream, #F5EEE2)",
        paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)",
      }}
    >
      <DiscoverToggle active={active} onChange={handleTabChange} />

      {active === "friends" ? (
        <FriendsFeed
          onTap={handleTap}
          onLongPress={startLongPress}
          onLongPressCancel={cancelLongPress}
          onContextMenu={handleRightClick}
          onSwitchToCommunity={() => handleTabChange("community")}
        />
      ) : (
        <CommunityFeed
          onTap={handleTap}
          onLongPress={startLongPress}
          onLongPressCancel={cancelLongPress}
          onContextMenu={handleRightClick}
        />
      )}

      {/* Context menu (right-click / long-press) */}
      {ctxMenu.visible && (
        <div
          ref={ctxMenuRef}
          className="fixed z-50"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[180px]"
            style={{
              boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
              animation: "ctxMenuPop 0.15s ease both",
            }}
          >
            <div className="px-4 py-2.5 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-900 line-clamp-1">{ctxMenu.recipeTitle}</p>
            </div>
            <button
              onClick={handleCtxSave}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 transition-colors active:bg-orange-100"
            >
              <svg
                className="w-4 h-4"
                style={{ color: "var(--tomato, #E5462E)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>Save to Collection</span>
            </button>
            {onAddToMealPlan && (
              <button
                onClick={handleCtxPlan}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 transition-colors active:bg-orange-100 border-t border-gray-50"
              >
                <svg
                  className="w-4 h-4"
                  style={{ color: "var(--tomato, #E5462E)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add to Meal Plan</span>
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes ctxMenuPop {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
