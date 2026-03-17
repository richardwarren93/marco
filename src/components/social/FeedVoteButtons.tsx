"use client";

import { useState } from "react";

interface FeedVoteButtonsProps {
  activityId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: "up" | "down" | null;
}

export default function FeedVoteButtons({
  activityId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
}: FeedVoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(initialUserVote);

  async function handleVote(type: "up" | "down") {
    const prevVote = userVote;
    const prevUp = upvotes;
    const prevDown = downvotes;

    if (userVote === type) {
      // Remove vote
      setUserVote(null);
      if (type === "up") setUpvotes((v) => v - 1);
      else setDownvotes((v) => v - 1);

      try {
        await fetch("/api/feed-votes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activity_id: activityId }),
        });
      } catch {
        setUserVote(prevVote);
        setUpvotes(prevUp);
        setDownvotes(prevDown);
      }
    } else {
      // Set or change vote
      setUserVote(type);
      if (type === "up") {
        setUpvotes((v) => v + 1);
        if (prevVote === "down") setDownvotes((v) => v - 1);
      } else {
        setDownvotes((v) => v + 1);
        if (prevVote === "up") setUpvotes((v) => v - 1);
      }

      try {
        await fetch("/api/feed-votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activity_id: activityId, vote_type: type }),
        });
      } catch {
        setUserVote(prevVote);
        setUpvotes(prevUp);
        setDownvotes(prevDown);
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote("up")}
        className={`flex items-center gap-1 text-sm transition-colors ${
          userVote === "up"
            ? "text-orange-600 font-semibold"
            : "text-gray-400 hover:text-orange-500"
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={userVote === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        {upvotes > 0 && <span>{upvotes}</span>}
      </button>

      <button
        onClick={() => handleVote("down")}
        className={`flex items-center gap-1 text-sm transition-colors ${
          userVote === "down"
            ? "text-gray-600 font-semibold"
            : "text-gray-400 hover:text-gray-500"
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={userVote === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
        {downvotes > 0 && <span>{downvotes}</span>}
      </button>
    </div>
  );
}
