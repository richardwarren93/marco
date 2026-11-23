"use client";

/* PageHeader — the app's one page header.
 *
 * It replaces six components that did the same job slightly differently:
 * ChaosHeader (/recipes), KitchenLayerHeader (/meal-plan, /grocery),
 * SubPageHeader (8 × /profile/*), MobileHeader (/friends, /profile),
 * plus the hand-rolled copies inside /kitchen and /friends-stack. They
 * disagreed on title size, ink (#171410 vs #1C1A17), typeface (Marker Felt vs
 * Fraunces), avatar treatment and safe-area padding, so moving between two
 * screens meant watching the header twitch.
 *
 * Three shapes, one component:
 *   <PageHeader title="My Recipes" subtitle="everything you've saved" avatar />
 *   <PageHeader title="Groceries" back={{ href: "/kitchen", label: "Kitchen" }} />
 *   <PageHeader title="Badges" back right={<ShareButton />} />
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { INK, LIME, PAPER, TOMATO } from "@/lib/theme";

const NotificationSheet = dynamic(() => import("@/components/notifications/NotificationSheet"), { ssr: false });
const HeaderTomatoBalance = dynamic(() => import("@/components/gamification/HeaderTomatoBalance"), { ssr: false });


type Back = true | { href: string; label?: string };

export default function PageHeader({
  title,
  subtitle,
  emoji,
  back,
  right,
  avatar = false,
  bell = false,
  balance = false,
}: {
  /** Page name. Rendered in the display face at one of two sizes. */
  title: ReactNode;
  /** Handwritten line under the title. */
  subtitle?: ReactNode;
  emoji?: string;
  /** `true` → chevron that goes back; `{href,label}` → labelled link. */
  back?: Back;
  /** Anything extra on the right, before the avatar. */
  right?: ReactNode;
  avatar?: boolean;
  bell?: boolean;
  balance?: boolean;
}) {
  const router = useRouter();
  const hasBack = Boolean(back);

  return (
    <div
      className="flex items-end gap-2 px-4 max-w-lg mx-auto"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)", paddingBottom: 8 }}
    >
      {hasBack && (
        <BackControl
          back={back as Back}
          onBack={() => (window.history.length > 1 ? router.back() : router.push("/kitchen"))}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1
            className="truncate"
            style={{
              fontFamily: "var(--font-chaos)",
              fontWeight: 700,
              fontSize: hasBack ? 24 : 28,
              letterSpacing: "-0.02em",
              color: INK,
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {emoji && <span style={{ fontSize: 18 }} aria-hidden>{emoji}</span>}
        </div>
        {subtitle && (
          <div style={{ fontFamily: "var(--font-hand)", fontSize: 16, color: TOMATO, transform: "rotate(-2deg)", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {balance && <HeaderTomatoBalance />}
        {bell && <NotificationBell />}
        {right}
        {avatar && <HeaderAvatar />}
      </div>
    </div>
  );
}

function BackControl({ back, onBack }: { back: Back; onBack: () => void }) {
  const chevron = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );

  if (back === true) {
    return (
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors flex-shrink-0 self-center"
      >
        {chevron}
      </button>
    );
  }

  return (
    <Link
      href={back.href}
      aria-label={back.label ? `Back to ${back.label}` : "Back"}
      className="flex items-center gap-0.5 flex-shrink-0 self-center hover:opacity-70 transition-opacity"
      style={{ color: INK, textDecoration: "none" }}
    >
      {chevron}
      {back.label && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, letterSpacing: "0.06em" }}>{back.label}</span>
      )}
    </Link>
  );
}

/* The signed-in user's face, linking to /profile. Both ChaosHeader and
   MobileHeader fetched this independently, with different fallbacks and
   different link targets. */
function HeaderAvatar() {
  const [initials, setInitials] = useState("?");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    let active = true;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !active) return;
      const { data: p } = await sb.from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).single();
      if (!active) return;
      if (p?.avatar_url) setAvatarUrl(p.avatar_url as string);
      const name = (p?.display_name as string) || user.email?.split("@")[0] || "";
      if (name) setInitials(name.slice(0, 1).toUpperCase());
    })();
    return () => { active = false; };
  }, []);

  return (
    <Link
      href="/profile"
      aria-label="Your profile"
      className="flex items-center justify-center overflow-hidden flex-shrink-0 ml-1"
      style={{ width: 42, height: 42, borderRadius: 99, background: INK, color: PAPER, fontFamily: "var(--font-chaos)", fontWeight: 700, fontSize: 16, transform: "rotate(5deg)", border: `2px solid ${LIME}` }}
    >
      {avatarUrl ? <Image src={avatarUrl} alt="" width={42} height={42} className="w-full h-full object-cover" /> : initials}
    </Link>
  );
}

function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sb = createClient();
    let active = true;
    const read = async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !active) return;
      const { count } = await sb
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (active) setUnread(count ?? 0);
    };
    void read();
    const t = setInterval(read, 60_000);
    return () => { active = false; clearInterval(t); };
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-[22px] h-[22px]"
          fill={unread > 0 ? TOMATO : "none"}
          stroke={unread > 0 ? TOMATO : INK}
          viewBox="0 0 24 24"
          strokeWidth={unread > 0 ? 1.5 : 1.8}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: TOMATO }} />}
      </button>
      {open && (
        <NotificationSheet
          isOpen={open}
          onClose={() => setOpen(false)}
          onUnreadChange={(n: number) => setUnread(n)}
        />
      )}
    </>
  );
}
