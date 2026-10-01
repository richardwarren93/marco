import Link from "next/link";

export const metadata = { title: "Marco for ChatGPT · ACGC", description: "Read your cooking data, preview recipe cards, and save recipes in ChatGPT. A free plugin by ACGC." };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true };

export default function MarcoPluginPage() {
  return <article className="min-h-screen bg-[#F5EEE2] px-6 py-16 text-[#1C1A17]">
    <div className="mx-auto max-w-2xl space-y-7">
      <p className="text-sm font-semibold uppercase tracking-widest">ACGC · Marco for ChatGPT</p>
      <h1 className="text-4xl font-bold tracking-tight">Your recipes, ready to cook.</h1>
      <p className="text-xl leading-relaxed">Bring the cooking data you already save in Marco into your ChatGPT conversation.</p>
      <ul className="list-disc space-y-3 pl-5">
        <li>Find your saved recipes by title and read ingredients and cooking steps.</li>
        <li>Check your personal meal plan and recorded pantry.</li>
        <li>Read saved grocery lists, including your shared household list.</li>
        <li>Preview recipe cards and save new recipes with your permission.</li>
      </ul>
      <section className="rounded-2xl border border-[#1C1A17]/20 bg-white/40 p-6 space-y-3">
        <h2 className="text-xl font-bold">Free, with your permission</h2>
        <p>A Marco account is required. Connect through ChatGPT and sign in to Marco to approve access. Marco Plus is not required for this plugin.</p>
        <p>Recipe saving requires a separate opt-in and an explicit save request. The plugin cannot edit or delete existing recipes, change plans, send messages, or buy groceries. Requested results are shared with OpenAI. You can disconnect the plugin in ChatGPT.</p>
        <p>Marco is currently being prepared for the public plugin directory. A public listing is not yet available.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Try a cooking question</h2>
        <ul className="list-disc space-y-2 pl-5"><li>Find a pasta recipe in my Marco recipes.</li><li>What is on my Marco meal plan this week?</li><li>Show my saved Marco grocery list.</li></ul>
      </section>
      <p>Published by ACGC. For help, email <a className="underline" href="mailto:questions@windwalk.com">questions@windwalk.com</a>.</p>
      <nav aria-label="Marco information" className="flex flex-wrap gap-5 underline">
        <Link href="/auth/login">Open Marco</Link><Link href="/support">Support</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of service</Link>
      </nav>
    </div>
  </article>;
}
