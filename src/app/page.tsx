import Link from "next/link";

export default function HomePage() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6"
      style={{ background: "#faf9f7" }}
    >
      <div className="text-center max-w-sm w-full space-y-6">
        {/* Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-2">
          <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }} />
          <div className="absolute inset-0 flex items-center justify-center text-6xl">🧑‍🍳</div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: "#1a1410" }}>
            Save recipes from<br />
            <span style={{ color: "#f97316" }}>anywhere</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#a09890" }}>
            Paste a link from Instagram or TikTok — Marco pulls the recipe with AI. Plan meals, build your grocery list, cook with friends.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Link
            href="/auth/signup"
            className="w-full flex items-center justify-center py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
            style={{ background: "#1a1410", boxShadow: "0 4px 20px rgba(26,20,16,0.18)" }}
          >
            Get Started — it&apos;s free
          </Link>
          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center py-4 rounded-2xl font-semibold text-base transition-all"
            style={{ background: "white", color: "#1a1410", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e8ddd3" }}
          >
            Log in
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-xs" style={{ color: "#c4b8af" }}>
          No credit card · No ads · Just cooking
        </p>
      </div>
    </div>
  );
}
