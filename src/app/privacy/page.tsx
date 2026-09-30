import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Marco",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-sm font-semibold" style={{ color: "#e8530a" }}>← Marco</Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight" style={{ color: "#1C1A17", letterSpacing: "-0.02em" }}>
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#a09890" }}>Last updated: September 30, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed" style={{ color: "#1C1A17" }}>
          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account:</strong> email, password (hashed), display name, avatar.</li>
              <li><strong>Phone number:</strong> only if you opt in to SMS on your Profile page.</li>
              <li><strong>Recipes & content:</strong> recipes you save, notes, photos, ratings, meal plans, grocery lists.</li>
              <li><strong>Preferences:</strong> allergies, dietary restrictions, household size, taste profile.</li>
              <li><strong>Usage data:</strong> standard server logs (IP, user agent, timestamps) for security and debugging.</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide the Service: save recipes, generate meal plans, run AI features.</li>
              <li>Personalize: tailor recommendations to your preferences and history.</li>
              <li>Communicate: send transactional emails and (if opted in) SMS messages.</li>
              <li>Operate: prevent abuse, fix bugs, improve the product.</li>
            </ul>
          </Section>

          <Section title="Marco in ChatGPT">
            <p>Marco&apos;s free, read-only ChatGPT plugin is published by ACGC. When you
              connect it, Supabase authenticates your Marco account and asks you to approve
              access. Your account identity and email link the connection.</p>
            <p className="mt-2">At your request, the plugin sends saved recipe details,
              personal meal plans, recorded pantry items, and saved grocery lists to
              OpenAI for use in ChatGPT. Grocery results can include your shared household
              list. The plugin does not create purchases, send messages, or edit these
              records. Its tools do not accept or store chat transcripts.</p>
            <p className="mt-2">Disconnect Marco in ChatGPT to remove its connection.
              Disconnecting does not delete the cooking records in your Marco account
              or information already returned to ChatGPT. Manage your ChatGPT data
              through OpenAI&apos;s controls and policies. Contact questions@windwalk.com
              for help with your Marco data.</p>
          </Section>

          <Section title="SMS data">
            If you verify a phone number on your Profile page, we store the number, the date
            you opted in, and a log of inbound and outbound messages so the Service can route
            replies and prevent abuse. <strong>We never share your phone number or SMS message
            content with third parties for marketing purposes.</strong> SMS data is processed
            only by Twilio (our SMS provider) and Anthropic (our AI provider) for the sole
            purpose of delivering replies you request. Reply STOP at any time to revoke
            consent — your phone number is unlinked and we stop sending messages.
          </Section>

          <Section title="Who we share with">
            <p className="mb-2">We use a small set of third-party processors to run Marco:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database, authentication, file storage.</li>
              <li><strong>Anthropic</strong> — AI for recipe extraction, search, and chat.</li>
              <li><strong>Twilio</strong> — SMS delivery (opt-in only).</li>
              <li><strong>Vercel</strong> — hosting and CDN.</li>
            </ul>
            <p className="mt-2">
              We don&apos;t sell your data. We don&apos;t share it with advertisers. We may also
              disclose data when required by law.
            </p>
          </Section>

          <Section title="Your rights">
            You can update or delete your account from the app at any time. Email
            questions@windwalk.com to request a copy of your data or full deletion.
          </Section>

          <Section title="Security">
            Passwords are hashed by Supabase Auth. Data is encrypted in transit (TLS) and at
            rest. We restrict admin access to what&apos;s necessary to operate the Service.
          </Section>

          <Section title="Children">
            Marco isn&apos;t intended for users under 13. If you think a child has signed up,
            email questions@windwalk.com and we&apos;ll remove the account.
          </Section>

          <Section title="Changes">
            We may update this Policy. Material changes will be announced in the app or via
            email.
          </Section>

          <Section title="Contact">
            Questions? Email questions@windwalk.com.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-2" style={{ color: "#1C1A17" }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
