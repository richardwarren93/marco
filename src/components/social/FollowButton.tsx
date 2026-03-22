"use client";

import { useState, useEffect } from "react";

interface FollowButtonProps {
  userId: string;
}

export default function FollowButton({ userId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/follows/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setIsFollowing(data.isFollowing);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: userId }),
      });

      if (res.ok) {
        setIsFollowing(!isFollowing);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-400"
      >
        ...
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isFollowing
          ? "bg-orange-600 text-white hover:bg-orange-700"
          : "border border-orange-600 text-orange-600 hover:bg-orange-50"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
