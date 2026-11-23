"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  BUTTER,
  DISPLAY,
  INK,
  INK_MUTED,
  INK_SOFT,
  LAV,
  LIME,
  MUSTARD,
  PAPER,
  SURFACE_DOTS,
  TOMATO,
  TOMATO_DARK,
} from "@/lib/theme";

/* The page a stranger lands on from a shared friend code, so it is the first
 * Marco surface a lot of people see. It used to be grey text on a grey page.
 *
 * The dock renders here (/add is not in DOCK_HIDDEN_ON), so the card is
 * centred in the space above it rather than in the whole viewport. */

const STICKERS = [BUTTER, LIME, LAV, MUSTARD];

function stickerFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return STICKERS[Math.abs(hash) % STICKERS.length];
}

const SHELL = {
  ...SURFACE_DOTS,
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: 130,
} as const;

const CARD = {
  background: PAPER,
  borderRadius: 20,
  border: `2.5px solid ${INK}`,
  boxShadow: `5px 6px 0 ${INK}`,
} as const;

const PRIMARY = {
  background: TOMATO,
  color: PAPER,
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 15,
  border: `2.5px solid ${INK}`,
  borderRadius: 12,
  boxShadow: `3px 3px 0 ${INK}`,
} as const;

export default function AddFriendPage() {
  const params = useParams();
  const code = params.code as string;

  const [user, setUser] = useState<User | null>(null);
  const [friendName, setFriendName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }: { data: { user: User | null } }) => setUser(u));

    // Lookup the friend code
    fetch(`/api/friends/lookup?code=${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setFriendName(data.display_name);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleSendRequest() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", message: data.error });
      } else {
        setResult({
          type: "success",
          message: `Friend request sent to ${data.friend_name}!`,
        });
      }
    } catch {
      setResult({ type: "error", message: "Something went wrong" });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div style={SHELL}>
        <div className="w-7 h-7 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={SHELL}>
        <div className="w-full max-w-sm mx-4 p-7 text-center" style={CARD}>
          <div className="text-5xl mb-3">🤷</div>
          <h1 className="mb-2" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 21 }}>
            Code not found
          </h1>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: INK_SOFT }}>
            The friend code &quot;{code}&quot; doesn&apos;t match anyone on Marco. Worth
            checking it for a stray character.
          </p>
          <Link
            href={user ? "/friends" : "/"}
            className="inline-block px-5 py-2.5 active:scale-95 transition-transform"
            style={{ ...PRIMARY, background: PAPER, color: INK }}
          >
            {user ? "Go to Friends" : "Go to Marco"}
          </Link>
        </div>
      </div>
    );
  }

  const name = friendName || "?";
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div style={SHELL}>
      <div className="w-full max-w-sm mx-4 p-7 text-center" style={CARD}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: stickerFor(name),
            color: INK,
            border: `2.5px solid ${INK}`,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 26,
          }}
        >
          {initials}
        </div>

        <h1 className="mb-1" style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, lineHeight: 1.15 }}>
          {friendName}
        </h1>
        <p className="text-sm mb-6" style={{ color: INK_SOFT }}>wants to cook with you on Marco</p>

        {user ? (
          <>
            {result?.type === "success" ? (
              <div className="space-y-4">
                <p
                  className="px-3 py-2 text-sm"
                  style={{ background: LIME, color: INK, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10 }}
                >
                  {result.message}
                </p>
                <Link href="/friends" className="inline-block px-6 py-2.5 active:scale-95 transition-transform" style={PRIMARY}>
                  Go to Friends
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleSendRequest}
                  disabled={sending}
                  className="w-full px-6 py-3 flex items-center justify-center active:scale-[0.98] transition-transform disabled:opacity-50"
                  style={PRIMARY}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-[var(--paper)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Send friend request"
                  )}
                </button>
                {result?.type === "error" && (
                  <p className="text-sm" style={{ color: TOMATO_DARK }}>{result.message}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/auth/signup?returnTo=/add/${code}`}
              className="block w-full px-6 py-3 active:scale-[0.98] transition-transform"
              style={PRIMARY}
            >
              Sign up to connect
            </Link>
            <Link
              href={`/auth/login?returnTo=/add/${code}`}
              className="block text-sm"
              style={{ color: INK_SOFT }}
            >
              Already have an account? <span style={{ color: TOMATO, fontWeight: 600 }}>Log in</span>
            </Link>
          </div>
        )}

        <p className="mt-6 text-[11px] uppercase tracking-[0.16em]" style={{ color: INK_MUTED, fontWeight: 700 }}>
          {code}
        </p>
      </div>
    </div>
  );
}
