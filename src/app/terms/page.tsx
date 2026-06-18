import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Marco",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-sm font-semibold" style={{ color: "#e8530a" }}>← Marco</Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight" style={{ color: "#1C1A17", letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#a09890" }}>Last updated: May 7, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed" style={{ color: "#1C1A17" }}>
          <Section title="1. Acceptance">
            By creating an account or using Marco (the &quot;Service&quot;), you agree to these Terms.
            If you don&apos;t agree, don&apos;t use the Service.
          </Section>

          <Section title="2. Account">
            You must be at least 13 years old. You&apos;re responsible for keeping your login
            credentials safe and for activity on your account.
          </Section>

          <Section title="3. Your content">
            Recipes, photos, notes, and other content you save are yours. You grant Marco a
            limited license to store, display, and process that content for the purpose of
            running the Service. We don&apos;t sell your content.
          </Section>

          <Section title="4. Acceptable use">
            Don&apos;t use Marco to break the law, infringe others&apos; rights, send spam,
            or interfere with the Service. We may suspend accounts that do.
          </Section>

          <Section title="5. SMS messaging">
            Marco offers an optional SMS interface. By verifying your phone number on your
            Profile page, you consent to receive transactional and conversational SMS messages
            from Marco — including verification codes, recipe save confirmations, recipe
            retrievals, and replies to cooking questions you initiate. Message frequency
            varies based on your usage. Message and data rates may apply. You can opt out at
            any time by replying STOP. Reply HELP for help. We never share your phone number
            or message content with third parties for marketing purposes.
          </Section>

          <Section title="6. Third-party services">
            Marco uses third-party services (Supabase for data, Anthropic for AI, Twilio for
            SMS, Vercel for hosting) to operate. Their handling of your data is covered by
            our <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </Section>

          <Section title="7. No warranty">
            The Service is provided &quot;as is.&quot; We don&apos;t guarantee accuracy of
            recipes, nutrition info, or AI-generated content. Use your judgment, especially
            for allergies and dietary restrictions.
          </Section>

          <Section title="8. Limitation of liability">
            To the fullest extent allowed by law, Marco isn&apos;t liable for indirect,
            incidental, or consequential damages arising from your use of the Service.
          </Section>

          <Section title="9. Termination">
            You can delete your account at any time. We may suspend or terminate accounts
            that violate these Terms.
          </Section>

          <Section title="10. Changes">
            We may update these Terms. Material changes will be announced in the app or via
            email. Continued use after changes means you accept the new Terms.
          </Section>

          <Section title="11. Contact">
            Questions? Email support@marco.app.
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
