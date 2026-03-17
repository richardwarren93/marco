"use client";

import { useState } from "react";

interface AddFriendFormProps {
  onRequestSent: () => void;
}

export default function AddFriendForm({ onRequestSent }: AddFriendFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleCodeChange(val: string) {
    // Auto-format: uppercase, strip spaces
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setCode(cleaned);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_code: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send request");
        return;
      }

      setSuccess(`Friend request sent to ${data.friend_name}!`);
      setCode("");
      onRequestSent();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="friend-code"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Enter a friend code
        </label>
        <div className="flex gap-2">
          <input
            id="friend-code"
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="MARCO-XXXX"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono tracking-wider"
            maxLength={10}
          />
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? "Sending..." : "Add Friend"}
          </button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
    </form>
  );
}
