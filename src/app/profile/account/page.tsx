"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/use-data";
import SubPageHeader from "@/components/layout/SubPageHeader";
import RestorePurchasesButton from "@/components/purchases/RestorePurchasesButton";

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
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader title="Account" />

      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        {/* ── Who you are ── */}
        {!isGuest && (
          <div className="p-4 rounded-2xl" style={{ background: "#FFFDF7", border: "1px solid rgba(28,26,23,0.08)" }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#a09890" }}>Signed in as</p>
            <p className="text-sm font-semibold mt-1 truncate" style={{ color: "#1C1A17" }}>{email || profile?.display_name || "—"}</p>
          </div>
        )}

        {/* ── Guest upgrade ── */}
        {isGuest && !showUpgrade && !upgradeSent && (
          <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: "#fff4ec", border: "1px solid #fcd9bd" }}>
            <span className="text-2xl flex-shrink-0">🔒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "#1C1A17" }}>Secure your account</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#a09890" }}>
                Add an email to access Marco from any device and never lose your recipes.
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="mt-2.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                style={{ background: "#e8530a" }}
              >
                Add email
              </button>
            </div>
          </div>
        )}

        {isGuest && showUpgrade && !upgradeSent && (
          <div className="p-4 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: "#1C1A17" }}>Secure your account</p>
              <button onClick={() => setShowUpgrade(false)} className="text-gray-400 text-sm" aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleUpgrade} className="space-y-2.5">
              {upgradeError && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs">{upgradeError}</div>
              )}
              <input
                type="email"
                value={upgradeEmail}
                onChange={(e) => setUpgradeEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 focus:bg-white transition-all"
              />
              <input
                type="password"
                value={upgradePassword}
                onChange={(e) => setUpgradePassword(e.target.value)}
                required
                minLength={6}
                placeholder="Choose a password (6+ chars)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={upgradeLoading}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: "#e8530a" }}
              >
                {upgradeLoading ? "Securing..." : "Secure account"}
              </button>
            </form>
          </div>
        )}

        {isGuest && upgradeSent && (
          <div className="p-4 rounded-2xl" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
            <p className="text-sm font-bold" style={{ color: "#065f46" }}>📬 Check your email!</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#065f46" }}>
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
            className="w-full py-3 rounded-2xl text-sm font-semibold text-red-500 transition-colors active:scale-[0.98]"
            style={{ background: "rgba(239,68,68,0.06)" }}
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
              className="w-full py-3 rounded-2xl text-sm font-medium transition-colors active:scale-[0.98]"
              style={{ color: "rgba(28,26,23,0.45)", background: "transparent" }}
            >
              Delete account
            </button>
          </div>
        )}
      </div>

      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => !deleting && setShowDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-xl"
            style={{ background: "#F5EEE2" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-2"
              style={{
                fontFamily: "var(--font-display, 'Fraunces', Georgia, serif)",
                fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 600',
                fontSize: "22px",
                color: "var(--ink, #1C1A17)",
              }}
            >
              Delete your account?
            </h3>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--ink-soft, #4A4742)" }}>
              This wipes your recipes, meal plans, household membership, friend connections, and saved
              groceries. We can&apos;t bring it back.
            </p>

            <label htmlFor="delete-confirm" className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink-soft, #4A4742)" }}>
              Type <span style={{ fontFamily: "monospace", color: "var(--ink, #1C1A17)" }}>DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={deleting}
              className="w-full px-4 py-3 rounded-2xl outline-none text-sm bg-white"
              style={{ border: "1px solid rgba(28,26,23,0.12)", color: "var(--ink, #1C1A17)" }}
              autoComplete="off"
              autoCapitalize="characters"
            />

            {deleteError && (
              <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-xl text-sm">{deleteError}</div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "rgba(28,26,23,0.06)", color: "var(--ink, #1C1A17)" }}
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
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "#E5462E" }}
              >
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
