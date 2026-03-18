"use client";

import { useEffect, useState } from "react";
import type { Household } from "@/types";

export default function HouseholdCard() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "create" | "join">("view");

  // Create form
  const [householdName, setHouseholdName] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHousehold();
  }, []);

  async function fetchHousehold() {
    try {
      const res = await fetch("/api/household");
      const data = await res.json();
      setHousehold(data.household || null);
      setUserRole(data.userRole || "member");
    } catch {
      // no household
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName.trim() || "My Household" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchHousehold();
      setMode("view");
      setHouseholdName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError("");

    try {
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchHousehold();
      setMode("view");
      setInviteCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Leave this household? You'll lose access to shared grocery lists.")) return;
    setLeaving(true);

    try {
      const res = await fetch("/api/household/leave", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHousehold(null);
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave");
    } finally {
      setLeaving(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this person from the household?")) return;
    setRemovingId(userId);

    try {
      const res = await fetch("/api/household/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchHousehold();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCopyCode() {
    if (household) {
      await navigator.clipboard.writeText(household.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    );
  }

  // Has a household — show it
  if (household) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              🏠 {household.name}
            </h3>
            <span className="text-xs text-gray-400">{household.members?.length || 1} member{(household.members?.length || 1) > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Members list */}
        <div className="px-5 py-3 space-y-2">
          {(household.members || []).map((member) => {
            const initials = (member.profile?.display_name || "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-xs font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.profile?.display_name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {member.role === "owner" ? "Owner" : "Member"}
                    </p>
                  </div>
                </div>
                {userRole === "owner" && member.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingId === member.user_id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {removingId === member.user_id ? "..." : "Remove"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite code */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Invite Code</p>
              <p className="text-lg font-bold text-orange-600 tracking-widest">{household.invite_code}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-white rounded-full text-xs font-medium shadow-sm hover:shadow transition-all"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Share this code so others can join your household
          </p>
        </div>

        {/* Leave */}
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            {leaving ? "Leaving..." : "Leave Household"}
          </button>
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-50 text-red-600 text-xs">{error}</div>
        )}
      </div>
    );
  }

  // No household — show create/join options
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          🏠 Household
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Share grocery lists with your housemates
        </p>
      </div>

      {mode === "view" && (
        <div className="p-5 space-y-3">
          <button
            onClick={() => { setMode("create"); setError(""); }}
            className="w-full py-3 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            Create a Household
          </button>
          <button
            onClick={() => { setMode("join"); setError(""); }}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Join with Invite Code
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={handleCreate} className="p-5 space-y-3">
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Household name (optional)"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("view"); setError(""); }}
              className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoin} className="p-5 space-y-3">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code (e.g. HOUSE-ABCD)"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent tracking-widest text-center font-mono"
            maxLength={10}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={joining || !inviteCode.trim()}
              className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("view"); setError(""); }}
              className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="px-5 py-2 bg-red-50 text-red-600 text-xs">{error}</div>
      )}
    </div>
  );
}
