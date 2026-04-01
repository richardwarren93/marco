import Link from "next/link";

export default function HomePage() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6"
      style={{ background: "#faf9f7" }}
    >
      <div className="text-center max-w-sm w-full flex flex-col items-center">
        {/* Logo */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #fff4e8 0%, #fde8cc 100%)" }} />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">{"\u{1F9D1}\u{200D}\u{1F373}"}</div>
        </div>
        <h2 className="text-lg font-bold mb-8" style={{ color: "#1a1410" }}>Marco</h2>

        {/* Value props */}
        <div className="space-y-2 mb-10">
          <h1 className="text-[30px] font-black leading-[1.15] tracking-tight" style={{ color: "#1a1410" }}>
            Save recipes from{" "}
            <span style={{ color: "#ea580c" }}>anywhere</span>
          </h1>
          <h1 className="text-[30px] font-black leading-[1.15] tracking-tight" style={{ color: "#1a1410" }}>
            Plan meals in{" "}
            <span style={{ color: "#ea580c" }}>seconds</span>
          </h1>
          <h1 className="text-[30px] font-black leading-[1.15] tracking-tight" style={{ color: "#1a1410" }}>
            Shop and{" "}
            <span style={{ color: "#ea580c" }}>earn back</span>
          </h1>
        </div>

        {/* Terms + Privacy (above buttons for mobile visibility) */}
        <p className="text-xs mb-5 leading-relaxed" style={{ color: "#a09890" }}>
          By continuing you agree to our{" "}
          <span className="underline font-medium" style={{ color: "#1a1410" }}>Terms</span>
          {" "}and{" "}
          <span className="underline font-medium" style={{ color: "#1a1410" }}>Privacy Policy</span>
        </p>

        {/* CTAs */}
        <div className="space-y-3 w-full">
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
        <p className="text-xs mt-4" style={{ color: "#c4b8af" }}>
          No credit card &middot; No ads &middot; Just cooking
        </p>
      </div>
    </div>
  );
}
