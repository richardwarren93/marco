"use client";

// The app's identity header — matches the Table (friends) tab: a Marker Felt
// wordmark + a handwritten subtitle + a profile avatar. No notification bell or
// tomato balance (that utility chrome belongs to the old app).

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const INK = "#171410";
const PAPER = "#FBF7EE";
const TOMATO = "#E5462E";
const LIME = "#C4EE45";
const DISP = '"Marker Felt", Georgia, serif';
const HAND = '"Bradley Hand", "Segoe Script", "Snell Roundhand", cursive';

export default function ChaosHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [initials, setInitials] = useState("?");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: p } = await sb.from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).single();
      if (p?.avatar_url) setAvatarUrl(p.avatar_url as string);
      const name = (p?.display_name as string) || user.email?.split("@")[0] || "";
      if (name) setInitials(name.slice(0, 1).toUpperCase());
    })();
  }, []);

  return (
    <div className="flex items-end justify-between px-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)", paddingBottom: 8 }}>
      <div className="min-w-0">
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: INK, lineHeight: 1 }}>{title}</div>
        {subtitle && <div style={{ fontFamily: HAND, fontSize: 17, color: TOMATO, transform: "rotate(-2deg)", marginTop: 5 }}>{subtitle}</div>}
      </div>
      <Link href="/recipes?tab=profile" aria-label="Profile" className="flex items-center justify-center overflow-hidden flex-shrink-0 ml-2" style={{ width: 42, height: 42, borderRadius: 99, background: INK, color: PAPER, fontFamily: DISP, fontWeight: 700, fontSize: 16, transform: "rotate(5deg)", border: `2px solid ${LIME}` }}>
        {avatarUrl ? <Image src={avatarUrl} alt="Profile" width={42} height={42} className="w-full h-full object-cover" /> : initials}
      </Link>
    </div>
  );
}
