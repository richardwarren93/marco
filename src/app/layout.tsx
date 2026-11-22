import type { Metadata, Viewport } from "next";
import { Geist, Fraunces, Caveat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppMain from "@/components/layout/AppMain";
import MarcoDock from "@/components/layout/MarcoDock";
import MarcoGuide from "@/components/guide/MarcoGuide";
import Providers from "@/components/ui/Providers";
import { CREAM } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Warm humanist display serif — the brand voice for headlines. Self-hosted by
// next/font so it loads inside the Capacitor remote-URL WebView too.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// The handwriting. `--font-hand` prefers the system faces Marco has always
// used (Marker Felt, Bradley Hand); this is what every device that doesn't
// have them gets instead of a generic `cursive`, which on Android is a
// clumsy serif.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: CREAM,
};

export const metadata: Metadata = {
  title: "Marco - Save & Plan Recipes",
  description: "Save recipes from Instagram and TikTok, manage your pantry, and plan meals with AI.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Marco",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/marco-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/marco-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Cream on <html> paints the canvas itself: with viewport-fit=cover the
    // iOS WebView extends under the home indicator, and any strip the body
    // doesn't cover (there, or in a rubber-band overscroll) showed up white.
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable} ${caveat.variable} bg-[var(--cream)]`}>
      <body className={`${geistSans.variable} ${fraunces.variable} ${caveat.variable} font-sans antialiased bg-[var(--cream)] text-[var(--ink)] h-full flex flex-col overscroll-none`}>
        {/* Prevent pinch-to-zoom and visual-viewport scroll on iOS PWA */}
        <Script id="prevent-zoom" strategy="afterInteractive">{`
          document.addEventListener('gesturestart', function(e) { if (!location.pathname.startsWith('/connect')) e.preventDefault(); }, { passive: false });
          document.addEventListener('gesturechange', function(e) { if (!location.pathname.startsWith('/connect')) e.preventDefault(); }, { passive: false });
          document.addEventListener('touchmove', function(e) { if (!location.pathname.startsWith('/connect') && e.touches.length > 1) e.preventDefault(); }, { passive: false });
          // When iOS keyboard opens it scrolls the visual viewport offset — lock it back to 0.
          // Only trigger when keyboard is actually open (viewport height < 75% of screen)
          // to avoid firing on normal navigation (which caused nav bar jump).
          if (window.visualViewport) {
            window.visualViewport.addEventListener('scroll', function() {
              if (window.visualViewport.height < window.screen.height * 0.75) {
                window.scrollTo(0, 0);
              }
            });
          }
          // Flag the document when running inside the Capacitor native shell so
          // CSS can pick up safe-area insets (display-mode: standalone doesn't
          // match in Capacitor WebView — see globals.css :root rule).
          if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
            document.documentElement.classList.add('capacitor-native');
          }
        `}</Script>
<Providers>
        <AppMain>{children}</AppMain>
        <MarcoDock />
        <MarcoGuide />
</Providers>
      </body>
    </html>
  );
}
