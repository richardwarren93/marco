"use client";

// Invite deep-link. Someone shares marco…/join/<code>; tapping it drops the
// visitor straight into that crew's table. Signed in → join now. Signed out →
// stash the code and send them to sign in; the Table consumes it on arrival.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCrewByCode, joinCrewByCode, type Crew } from "@/lib/social";
import { stashInvite } from "@/components/people/PendingInvites";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const COBALT = "#2540E8";
const BUTTER = "#FFD84D";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, monospace";

export const PENDING_CREW_KEY = "marco_pending_crew";

export default function JoinCrew() {
  const params = useParams();
  const router = useRouter();
  const code = String(params?.code ?? "").trim().toLowerCase();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [state, setState] = useState<"loading" | "need-auth" | "joining" | "not-found">("loading");

  useEffect(() => {
    if (!code) { setState("not-found"); return; }
    (async () => {
      const found = await getCrewByCode(code);
      if (!found) { setState("not-found"); return; }
      setCrew(found);
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        setState("joining");
        const joined = await joinCrewByCode(code);
        try { localStorage.removeItem(PENDING_CREW_KEY); } catch { /* ignore */ }
        router.replace(joined ? "/friends-stack" : "/crew");
      } else {
        stashInvite(PENDING_CREW_KEY, code);
        setState("need-auth");
      }
    })();
  }, [code, router]);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center" style={{ background: "#E9E2D3", position: "relative", overflowX: "hidden" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)", backgroundSize: "13px 13px" }} />
      <div className="relative w-full max-w-md px-6 text-center">
        {state === "not-found" ? (
          <>
            <div style={{ fontSize: 48 }} aria-hidden>🤔</div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color: INK, marginTop: 8 }}>that code&apos;s cold</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, marginTop: 4 }}>the invite may have expired or the link&apos;s off</div>
            <button onClick={() => router.replace("/crew")} style={{ marginTop: 20, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 22px", borderRadius: 14, border: "none" }}>Go to my tables</button>
          </>
        ) : state === "need-auth" ? (
          <>
            <div style={{ fontSize: 48 }} aria-hidden>🍽️</div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", color: INK, opacity: 0.6, marginTop: 10, textTransform: "uppercase" }}>you&apos;re invited to</div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, color: INK, lineHeight: 1.05, marginTop: 4 }}>{crew?.emoji} {crew?.name}</div>
            <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 6 }}>sign in and you&apos;re at the table</div>
            <button onClick={() => router.push("/auth/signup")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 22, background: TOMATO, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 18, padding: "15px 0", borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: "0 12px 26px rgba(229,70,46,0.32)" }}>Create my account →</button>
            <button onClick={() => router.push("/auth/login")} className="w-full active:scale-[0.98] transition-transform" style={{ marginTop: 12, background: PAPER, color: INK, fontFamily: DISP, fontWeight: 700, fontSize: 16, padding: "13px 0", borderRadius: 14, border: `2px solid ${INK}` }}>I already have an account</button>
            <div style={{ fontFamily: SANS, fontSize: 12.5, color: INK, opacity: 0.55, marginTop: 14 }}>we&apos;ll drop you into {crew?.name} right after.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44 }} aria-hidden>🍅</div>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK, marginTop: 10 }}>{state === "joining" ? "pulling up a chair…" : "finding the table…"}</div>
          </>
        )}
      </div>
    </div>
  );
}
