import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREAM, INK, TEAL, TOMATO } from "@/lib/theme";

// Marco internal analytics — DEV ONLY. This page exposes aggregate data across
// ALL users via the service-role client, so it must never ship to production:
// it 404s outside `next dev`. View it at http://localhost:3000/admin while
// running the app locally (it reads the same Supabase the app is pointed at).
//
// Local/dev-only was the chosen access model — there is intentionally no auth
// gate here beyond the environment check, because the route doesn't exist in a
// production build.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


type Row = Record<string, unknown>;

// Fetch all rows of a few columns; returns [] on any error (missing table /
// unrun migration) so one gap never blanks the whole dashboard.
async function fetchAll(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  columns: string,
): Promise<Row[]> {
  try {
    const { data, error } = await admin.from(table).select(columns);
    if (error) return [];
    return (data as unknown as Row[]) ?? [];
  } catch {
    return [];
  }
}

async function countRows(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any,
): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = admin.from(table).select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

// Bucket ISO timestamps into the last `weeks` Monday-aligned weekly counts.
function weeklyBuckets(timestamps: (string | null | undefined)[], weeks = 12) {
  const now = new Date();
  const dow = (now.getUTCDay() + 6) % 7; // 0 = Monday
  const thisWeekStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow);
  const firstStart = thisWeekStart - (weeks - 1) * 7 * 86400000;
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(firstStart + i * 7 * 86400000);
    return { label: `${start.getUTCMonth() + 1}/${start.getUTCDate()}`, count: 0 };
  });
  for (const ts of timestamps) {
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (Number.isNaN(t) || t < firstStart) continue;
    const idx = Math.floor((t - firstStart) / (7 * 86400000));
    if (idx >= 0 && idx < weeks) buckets[idx].count++;
  }
  return buckets;
}

function tally(rows: Row[], key: string): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] ?? "unknown") as string;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export default async function AdminAnalyticsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Cross-user aggregates must bypass row-level security, which requires the
  // service-role key. It's not in .env.local by default — guide the user
  // instead of throwing a 500.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <SetupNotice />;
  }

  const admin = createAdminClient();

  // One pass each over the two big tables; cheap head-counts for the rest.
  const [
    profiles,
    recipes,
    households,
    householdMembers,
    mealPlans,
    cooks,
    friendsAccepted,
    recipeShares,
    collections,
  ] = await Promise.all([
    fetchAll(admin, "user_profiles", "created_at, onboarding_completed, subscription_tier"),
    fetchAll(admin, "recipes", "created_at, source_platform"),
    countRows(admin, "households"),
    countRows(admin, "household_members"),
    countRows(admin, "meal_plans"),
    countRows(admin, "cooking_logs"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countRows(admin, "friendships", (q: any) => q.eq("status", "accepted")),
    countRows(admin, "recipe_shares"),
    countRows(admin, "collections"),
  ]);

  // ── Growth ──
  const totalUsers = profiles.length;
  const onboarded = profiles.filter((p) => p.onboarding_completed === true).length;
  const onboardRate = totalUsers ? Math.round((onboarded / totalUsers) * 100) : 0;
  const signupsWeekly = weeklyBuckets(profiles.map((p) => p.created_at as string));

  // ── Engagement ──
  const totalRecipes = recipes.length;
  const recipesPerUser = totalUsers ? (totalRecipes / totalUsers).toFixed(1) : "0";
  const recipesWeekly = weeklyBuckets(recipes.map((r) => r.created_at as string));
  const sources = tally(recipes, "source_platform");

  // ── Monetization ──
  const tiers = tally(profiles, "subscription_tier");
  const plusCount = tiers.find((t) => t.label === "plus")?.count ?? 0;
  const freeCount = totalUsers - plusCount;

  // ── Households ──
  const avgMembers =
    households && householdMembers && households > 0
      ? (householdMembers / households).toFixed(1)
      : "—";

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "28px 20px 64px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div className="flex items-baseline justify-between mb-1">
          <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 144, "wght" 700', fontSize: 34, color: INK }}>
            Marco Analytics
          </h1>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: TOMATO }}>
            dev only
          </span>
        </div>
        <p style={{ color: "#8a8178", fontSize: 13, marginBottom: 28 }}>
          Live aggregates across all users · {new Date().toLocaleString()}
        </p>

        {/* ── Growth ── */}
        <Section title="Growth">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total users" value={totalUsers} />
            <Stat label="Onboarding completed" value={`${onboardRate}%`} sub={`${onboarded} of ${totalUsers}`} />
            <Stat label="New this week" value={signupsWeekly[signupsWeekly.length - 1]?.count ?? 0} />
          </div>
          <ChartCard title="New signups / week" data={signupsWeekly} color={TOMATO} />
        </Section>

        {/* ── Engagement ── */}
        <Section title="Engagement">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Recipes saved" value={totalRecipes} />
            <Stat label="Recipes / user" value={recipesPerUser} />
            <Stat label="Meal plans" value={fmt(mealPlans)} />
            <Stat label="Cooks logged" value={fmt(cooks)} />
          </div>
          <ChartCard title="Recipes saved / week" data={recipesWeekly} color={TEAL} />
          {sources.length > 0 && (
            <Breakdown title="Import sources" rows={sources} total={totalRecipes} color={TEAL} />
          )}
        </Section>

        {/* ── Households & social ── */}
        <Section title="Households & social">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Households" value={fmt(households)} />
            <Stat label="Avg members / household" value={avgMembers} />
            <Stat label="Friendships" value={fmt(friendsAccepted)} />
            <Stat label="Recipe shares" value={fmt(recipeShares)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Stat label="Collections" value={fmt(collections)} />
          </div>
        </Section>

        {/* ── Monetization ── */}
        <Section title="Monetization">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Marco Plus" value={plusCount} sub="active subscribers" />
            <Stat label="Free" value={freeCount} />
            <Stat label="Conversion" value={totalUsers ? `${Math.round((plusCount / totalUsers) * 100)}%` : "0%"} />
          </div>
          <p style={{ color: "#9b938a", fontSize: 12, marginTop: 10, fontStyle: "italic" }}>
            Plus numbers populate once RevenueCat is live (Phase 2). Until then everyone is on free.
          </p>
        </Section>
      </div>
    </div>
  );
}

function fmt(n: number | null): string {
  return n === null ? "—" : String(n);
}

function SetupNotice() {
  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "28px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 520, background: "white", borderRadius: 18, padding: "28px 30px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 144, "wght" 700', fontSize: 26, color: INK, marginBottom: 8 }}>
          One env var to go
        </h1>
        <p style={{ color: "#6b635a", fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          The analytics dashboard reads aggregate data across all users, which needs the Supabase
          <strong> service-role</strong> key (it bypasses row-level security). Add it to your local{" "}
          <code style={{ background: "#f0ece3", padding: "1px 5px", borderRadius: 4 }}>.env.local</code> and restart{" "}
          <code style={{ background: "#f0ece3", padding: "1px 5px", borderRadius: 4 }}>npm run dev</code>:
        </p>
        <pre style={{ background: INK, color: CREAM, padding: "12px 14px", borderRadius: 10, fontSize: 12.5, overflowX: "auto", marginBottom: 16 }}>
SUPABASE_SERVICE_ROLE_KEY=eyJ...your service_role secret
        </pre>
        <p style={{ color: "#8a8178", fontSize: 12.5, lineHeight: 1.5 }}>
          Find it in the Supabase dashboard → <strong>Project Settings → API → Project API keys → service_role</strong>.
          Keep it secret — never expose it client-side or commit it. It only lives in <code style={{ background: "#f0ece3", padding: "1px 5px", borderRadius: 4 }}>.env.local</code> (already git-ignored).
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8178", marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
      <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 144, "wght" 700', fontSize: 30, color: INK, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: "#8a8178", marginTop: 6, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: "#b3aaa0", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: { label: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "16px 18px 12px", marginTop: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 11.5, color: "#8a8178", fontWeight: 600, marginBottom: 14 }}>{title}</div>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
            <span style={{ fontSize: 9, color: "#b3aaa0", marginBottom: 3 }}>{d.count || ""}</span>
            <div
              title={`${d.label}: ${d.count}`}
              style={{
                width: "100%",
                height: `${(d.count / max) * 100}%`,
                minHeight: d.count > 0 ? 3 : 0,
                background: color,
                borderRadius: "4px 4px 0 0",
              }}
            />
            <span style={{ fontSize: 8, color: "#b3aaa0", marginTop: 4 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Breakdown({ title, rows, total, color }: { title: string; rows: { label: string; count: number }[]; total: number; color: string }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "16px 18px", marginTop: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 11.5, color: "#8a8178", fontWeight: 600, marginBottom: 12 }}>{title}</div>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const pct = total ? Math.round((r.count / total) * 100) : 0;
          return (
            <div key={r.label}>
              <div className="flex justify-between" style={{ fontSize: 12, color: INK, marginBottom: 3 }}>
                <span style={{ textTransform: "capitalize" }}>{r.label}</span>
                <span style={{ color: "#8a8178" }}>{r.count} · {pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
