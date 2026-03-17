"use client";

import { useEffect, useState } from "react";
import type { Friendship } from "@/types";

interface ShareWithFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "recipe" | "collection";
  itemId: string;
  itemTitle: string;
}

export default function ShareWithFriendsModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
}: ShareWithFriendsModalProps) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSent(new Set());
    setMessage("");
    fetch("/api/friends")
      .then((res) => res.json())
      .then((data) => setFriends(data.friends || []))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  async function handleShare(friendUserId: string) {
    setSending(friendUserId);
    try {
      const endpoint =
        itemType === "recipe"
          ? "/api/recipes/share"
          : "/api/collections/share-with-friend";

      const body =
        itemType === "recipe"
          ? { recipe_id: itemId, friend_user_id: friendUserId, message }
          : {
              collection_id: itemId,
              friend_user_id: friendUserId,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSent((prev) => new Set(prev).add(friendUserId));
      }
    } catch {
      // ignore
    } finally {
      setSending(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Share &quot;{itemTitle}&quot;
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
          </div>
          {itemType === "recipe" && (
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note (optional)"
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No friends yet. Add friends first to share!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => {
                const friendUserId =
                  f.profile?.user_id || "";
                const name = f.profile?.display_name || "Unknown";
                const initials = name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const isSent = sent.has(friendUserId);
                const isSending = sending === friendUserId;

                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {initials}
                    </div>
                    <span className="flex-1 font-medium text-gray-900 truncate">
                      {name}
                    </span>
                    <button
                      onClick={() => handleShare(friendUserId)}
                      disabled={isSending || isSent}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSent
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                      }`}
                    >
                      {isSent ? "Sent!" : isSending ? "..." : "Share"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
