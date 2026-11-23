"use client";

import { useEffect, useState } from "react";
import type { Household } from "@/types";
import {
  BUTTER,
  CREAM_WARM,
  DISPLAY,
  HAND,
  INK,
  INK_SOFT,
  LAV,
  LIME,
  MONO,
  MUSTARD,
  PAPER,
  TOMATO,
  TOMATO_DARK,
} from "@/lib/theme";

/* Only the light half of the brand palette: these sit behind INK initials, so a
   dark sticker (COBALT, PINK) would leave the letters unreadable. */
const STICKERS = [BUTTER, LIME, LAV, MUSTARD];

/* Hashed on the name rather than the list index, so removing one housemate
   doesn't recolour everyone below them. */
function stickerFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return STICKERS[Math.abs(hash) % STICKERS.length];
}

const CARD = {
  background: PAPER,
  borderRadius: 16,
  border: `2.5px solid ${INK}`,
  boxShadow: `4px 5px 0 ${INK}`,
} as const;

const BTN = {
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 13.5,
  border: `2.5px solid ${INK}`,
  borderRadius: 10,
  boxShadow: `3px 3px 0 ${INK}`,
} as const;

const BAND = { borderTop: `2px solid ${INK}` } as const;

const LABEL = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontWeight: 700,
  color: INK,
  opacity: 0.65,
} as const;

const INPUT = {
  background: CREAM_WARM,
  border: `2px solid ${INK}`,
  borderRadius: 12,
  color: INK,
} as const;

/* A repeated per-row action, so it takes the small ink-edged pill the
   collection detail page uses for its own row actions — not the wavy link
   below, which is for a once-ever decision and reads as decoration when it
   appears three times down a list. */
const ROW_ACTION = {
  background: PAPER,
  color: INK,
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 12,
  border: `2px solid ${INK}`,
  borderRadius: 99,
  boxShadow: `2px 2px 0 ${INK}`,
  minWidth: 74,
  minHeight: 30,
} as const;

/* Leaving is destructive and happens once, so it stays unframed — the same
   wavy-underlined treatment as "Delete account" on /profile/account, which
   deliberately reads as a last resort rather than a button. */
const DESTRUCTIVE = {
  color: INK_SOFT,
  background: "transparent",
  fontFamily: HAND,
  fontSize: 13.5,
  textDecoration: "underline",
  textDecorationStyle: "wavy",
  textDecorationColor: "rgba(23,20,16,0.25)",
  textUnderlineOffset: 3,
} as const;

const ERROR = {
  background: "rgba(229,70,46,0.12)",
  color: TOMATO_DARK,
  borderTop: `2px solid ${INK}`,
} as const;

function HouseIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" style={{ color: TOMATO }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

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
      <div className="p-5" style={CARD}>
        <div className="h-5 w-32 mb-3 skeleton-warm" style={{ borderRadius: 8 }} />
        <div className="h-12 skeleton-warm" style={{ borderRadius: 10 }} />
      </div>
    );
  }

  // Has a household — show it
  if (household) {
    const memberCount = household.members?.length || 1;

    return (
      <div className="overflow-hidden" style={CARD}>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 min-w-0" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
              <HouseIcon />
              <span className="truncate">{household.name}</span>
            </h3>
            <span className="flex-shrink-0" style={{ color: INK_SOFT, fontSize: 12 }}>
              {memberCount} member{memberCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Members list */}
        <div className="px-5 py-3 space-y-2.5" style={BAND}>
          {(household.members || []).map((member) => {
            const name = member.profile?.display_name || "Unknown";
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={member.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: stickerFor(name),
                      border: `2px solid ${INK}`,
                      color: INK,
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 11.5,
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate" style={{ color: INK, fontSize: 14, fontWeight: 600 }}>
                      {name}
                    </p>
                    <p style={{ color: INK_SOFT, fontSize: 11.5 }}>
                      {member.role === "owner" ? "Owner" : "Member"}
                    </p>
                  </div>
                </div>
                {userRole === "owner" && member.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingId === member.user_id}
                    className="px-3 py-1.5 flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                    style={ROW_ACTION}
                  >
                    {removingId === member.user_id ? (
                      <div className="w-3 h-3 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite code — the butter panel and MONO lettering FriendCodeCard uses
            for the friend code, since both are "a code you pass to someone". */}
        <div className="px-5 py-3.5" style={{ ...BAND, background: BUTTER }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p style={LABEL}>Invite code</p>
              <p style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", color: INK }}>
                {household.invite_code}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 flex-shrink-0 active:scale-95 transition-transform"
              style={{ ...BTN, background: PAPER, color: INK }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5" style={{ color: INK, opacity: 0.7, fontSize: 12 }}>
            Share this code so others can join your household
          </p>
        </div>

        {/* Leave */}
        <div className="px-5 py-3" style={BAND}>
          <button onClick={handleLeave} disabled={leaving} className="disabled:opacity-50" style={DESTRUCTIVE}>
            {leaving ? "Leaving…" : "Leave household"}
          </button>
        </div>

        {error && (
          <div className="px-5 py-2.5" style={{ ...ERROR, fontSize: 12.5 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // No household — show create/join options
  return (
    <div className="overflow-hidden" style={CARD}>
      <div className="px-5 py-4">
        <h3 className="flex items-center gap-2" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
          <HouseIcon />
          No household yet
        </h3>
        <p className="mt-0.5" style={{ color: INK_SOFT, fontSize: 12.5 }}>
          Share grocery lists with your housemates
        </p>
      </div>

      {mode === "view" && (
        <div className="p-5 space-y-3" style={BAND}>
          <button
            onClick={() => { setMode("create"); setError(""); }}
            className="w-full py-3 active:scale-[0.98] transition-transform"
            style={{ ...BTN, background: TOMATO, color: PAPER }}
          >
            Create a household
          </button>
          <button
            onClick={() => { setMode("join"); setError(""); }}
            className="w-full py-3 active:scale-[0.98] transition-transform"
            style={{ ...BTN, background: PAPER, color: INK }}
          >
            Join with invite code
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={handleCreate} className="p-5 space-y-3" style={BAND}>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Household name (optional)"
            className="w-full px-4 py-2.5 text-sm outline-none"
            style={INPUT}
            onFocus={(e) => { e.currentTarget.style.background = PAPER; }}
            onBlur={(e) => { e.currentTarget.style.background = CREAM_WARM; }}
          />
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              style={{ ...BTN, background: TOMATO, color: PAPER }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("view"); setError(""); }}
              className="px-4 py-2.5 active:scale-[0.98] transition-transform"
              style={{ ...BTN, background: PAPER, color: INK }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoin} className="p-5 space-y-3" style={BAND}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="HOUSE-ABCD"
            className="w-full px-4 py-2.5 text-center outline-none"
            style={{ ...INPUT, fontFamily: MONO, fontSize: 15, letterSpacing: "0.12em" }}
            maxLength={10}
            onFocus={(e) => { e.currentTarget.style.background = PAPER; }}
            onBlur={(e) => { e.currentTarget.style.background = CREAM_WARM; }}
          />
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={joining || !inviteCode.trim()}
              className="flex-1 py-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              style={{ ...BTN, background: TOMATO, color: PAPER }}
            >
              {joining ? "Joining…" : "Join"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("view"); setError(""); }}
              className="px-4 py-2.5 active:scale-[0.98] transition-transform"
              style={{ ...BTN, background: PAPER, color: INK }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="px-5 py-2.5" style={{ ...ERROR, fontSize: 12.5 }}>
          {error}
        </div>
      )}
    </div>
  );
}
