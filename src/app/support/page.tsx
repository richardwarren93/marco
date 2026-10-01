import Link from "next/link";

export const metadata = {
  title: "Support · Marco",
};

// Publisher-confirmed support address.
const SUPPORT_EMAIL = "questions@windwalk.com";

export default function SupportPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-sm font-semibold" style={{ color: "#e8530a" }}>← Marco</Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight" style={{ color: "#1C1A17", letterSpacing: "-0.02em" }}>
          Support
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#a09890" }}>
          We&apos;re a small team and we read every message.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed" style={{ color: "#1C1A17" }}>
          <Section title="Get in touch">
            <p>
              Questions, bugs, or feedback? Email us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold" style={{ color: "#e8530a" }}>
                {SUPPORT_EMAIL}
              </a>
              . We typically reply within 1–2 business days.
            </p>
          </Section>

          <Section title="Common questions">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Marco in ChatGPT.</strong> The free plugin by ACGC reads your saved
                recipes, personal meal plan, pantry, and saved grocery lists. It does not
                require Marco Plus. Connect your Marco account in ChatGPT and approve
                access; disconnect from ChatGPT&apos;s plugin settings when needed.
                To save a new recipe, enable recipe saving using the link in its recipe
                card, then press Save to Marco or explicitly ask ChatGPT to save it.
                <Link href="/connect/about" className="underline"> Learn about the plugin.</Link>
              </li>
              <li>
                <strong>How do I save a recipe?</strong> Open the Recipes tab, tap Import, and paste a
                link from a video or website — or share directly to Marco from another app.
              </li>
              <li>
                <strong>How do I build a grocery list?</strong> Add recipes to your weekly Meal Plan, then
                open the auto-generated grocery list.
              </li>
              <li>
                <strong>Marco Plus &amp; billing.</strong> Plus is an auto-renewing subscription billed
                through your Apple ID. Manage or cancel anytime in{" "}
                <em>iOS Settings → your name → Subscriptions</em>. Restore a previous purchase from{" "}
                <em>Profile → Account → Restore Purchases</em>.
              </li>
              <li>
                <strong>Delete my account.</strong> Go to <em>Profile → Account</em>, or email us and we&apos;ll
                remove your data.
              </li>
            </ul>
          </Section>

          <Section title="More">
            <p className="space-x-4">
              <Link href="/privacy" className="font-semibold" style={{ color: "#e8530a" }}>Privacy Policy</Link>
              <Link href="/terms" className="font-semibold" style={{ color: "#e8530a" }}>Terms of Service</Link>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-black" style={{ color: "#1C1A17" }}>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
