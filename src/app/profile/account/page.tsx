"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/use-data";
import SubPageShell from "@/components/layout/SubPageShell";
import RestorePurchasesButton from "@/components/purchases/RestorePurchasesButton";
import { BUTTER, DISPLAY, HAND, INK, INK_MUTED, INK_SOFT, LIME, MONO, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

/* Account — the one-time/dangerous stuff, moved off the profile hub: guest
   email upgrade, restore purchases (App Store requirement), log out, and
   delete account. Logic transplanted unchanged from the old profile page. */

export default function AccountPage() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile ?? null;

  // Detect anonymous (guest) users
  const [isGuest, setIsGuest] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSent, setUpgradeSent] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: { is_anonymous?: boolean; email?: string } | null } }) => {
      setIsGuest(result.data.user?.is_anonymous === true);
      setEmail(result.data.user?.email ?? null);
    });
  }, []);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setUpgradeError("");
    setUpgradeLoading(true);
    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({ password: upgradePassword });
    if (pwError) {
      setUpgradeError(pwError.message);
      setUpgradeLoading(false);
      return;
    }
    const { error: emailError } = await supabase.auth.updateUser({ email: upgradeEmail });
    if (emailError) {
      setUpgradeError(emailError.message);
      setUpgradeLoading(false);
      return;
    }
    setUpgradeSent(true);
    setUpgradeLoading(false);
  }

  return (
    <SubPageShell title="Account">
        {/* ── Who you are ── */}
        {!isGuest && (
          <div className="p-4" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: INK_MUTED }}>Signed in as</p>
            <p className="text-sm font-semibold mt-1 truncate" style={{ color: INK }}>{email || profile?.display_name || "—"}</p>
          </div>
        )}

        {/* ── Guest upgrade ── */}
        {isGuest && !showUpgrade && !upgradeSent && (
          <div className="p-4 flex items-start gap-3" style={{ background: BUTTER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <span className="text-2xl flex-shrink-0">🔒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: INK }}>Secure your account</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: INK_MUTED }}>
                Add an email to access Marco from any device and never lose your recipes.
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="mt-2.5 px-4 py-1.5 active:scale-95 transition-transform"
                style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, border: `2px solid ${INK}`, borderRadius: 99, boxShadow: `2px 2px 0 ${INK}` }}
              >
                Add email
              </button>
            </div>
          </div>
        )}

        {isGuest && showUpgrade && !upgradeSent && (
          <div className="p-4" style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: INK }}>Secure your account</p>
              <button onClick={() => setShowUpgrade(false)} className="text-sm" style={{ color: INK, opacity: 0.45 }} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleUpgrade} className="space-y-2.5">
              {upgradeError && (
                <div className="p-2.5 text-xs" style={{ background: "rgba(229,70,46,0.12)", color: TOMATO_DARK, border: `2px solid ${INK}`, borderRadius: 12 }}>{upgradeError}</div>
              )}
              <input
                type="email"
                value={upgradeEmail}
                onChange={(e) => setUpgradeEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 12 }}
              />
              <input
                type="password"
                value={upgradePassword}
                onChange={(e) => setUpgradePassword(e.target.value)}
                required
                minLength={6}
                placeholder="Choose a password (6+ chars)"
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 12 }}
              />
              <button
                type="submit"
                disabled={upgradeLoading}
                className="w-full py-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
                style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 4px 0 ${INK}` }}
              >
                {upgradeLoading ? "Securing..." : "Secure account"}
              </button>
            </form>
          </div>
        )}

        {isGuest && upgradeSent && (
          <div className="p-4" style={{ background: LIME, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}>
            <p className="text-sm font-bold" style={{ color: INK }}>📬 Check your email!</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: INK_SOFT }}>
              We sent a confirmation link to <strong>{upgradeEmail}</strong>. Click it to finish securing your account.
            </p>
          </div>
        )}

        {/* ── Restore purchases (App Store requirement) ── */}
        <div className="pt-6">
          <RestorePurchasesButton />
        </div>

        {/* ── Log out ── */}
        <div className="pt-3">
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              document.cookie = "marco_onboarded=; path=/; max-age=0";
              window.location.href = "/auth/signup";
            }}
            className="w-full py-3 active:scale-[0.98] transition-transform"
            style={{ background: PAPER, color: TOMATO, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 4px 0 ${INK}` }}
          >
            Log out
          </button>
        </div>

        {/* ── Delete account ── separated visually so it's clearly the point of
            no return. Guests can't hit it (no password to confirm and no data
            worth losing). */}
        {!isGuest && (
          <div className="pt-3">
            <button
              onClick={() => { setShowDelete(true); setDeleteConfirmText(""); setDeleteError(""); }}
              className="w-full py-3 active:scale-[0.98] transition-transform"
              style={{ color: INK_SOFT, background: "transparent", fontFamily: HAND, fontSize: 15, textDecoration: "underline", textDecorationStyle: "wavy", textDecorationColor: "rgba(23,20,16,0.25)", textUnderlineOffset: 3 }}
            >
              Delete account
            </button>
          </div>
        )}

      {showDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => !deleting && setShowDelete(false)}
        >
          <div
            className="w-full max-w-sm p-6"
            style={{ background: PAPER, borderRadius: 20, border: `2.5px solid ${INK}`, boxShadow: `5px 6px 0 ${INK}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-2"
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
                fontSize: "22px",
                color: "var(--ink, #171410)",
              }}
            >
              Delete your account?
            </h3>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--ink-soft, #4A4742)" }}>
              This wipes your recipes, meal plans, household membership, friend connections, and saved
              groceries. We can&apos;t bring it back.
            </p>

            <label htmlFor="delete-confirm" className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft, #4A4742)" }}>
              Type <span style={{ fontFamily: "monospace", color: "var(--ink, #171410)" }}>DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={deleting}
              className="w-full px-4 py-3 outline-none text-sm"
              style={{ background: PAPER, border: `2px solid ${INK}`, borderRadius: 12, color: INK, fontFamily: MONO, letterSpacing: "0.1em" }}
              autoComplete="off"
              autoCapitalize="characters"
            />

            {deleteError && (
              <div className="mt-3 p-3 text-sm" style={{ background: "rgba(229,70,46,0.12)", color: TOMATO_DARK, border: `2px solid ${INK}`, borderRadius: 12 }}>{deleteError}</div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 py-3 active:scale-[0.98] transition-transform disabled:opacity-50"
                style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 4px 0 ${INK}` }}
              >
                Keep my account
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError("");
                  const res = await fetch("/api/auth/delete", { method: "POST" });
                  if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    setDeleteError(body.error || "Couldn't delete the account. Try again?");
                    setDeleting(false);
                    return;
                  }
                  document.cookie = "marco_onboarded=; path=/; max-age=0";
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = "/auth/signup";
                }}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex-1 py-3 active:scale-[0.98] transition-transform disabled:opacity-50"
                style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 4px 0 ${INK}` }}
              >
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SubPageShell>
  );
}
