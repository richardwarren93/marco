import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import BottomTabBar from "@/components/layout/BottomTabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Marco - Save & Plan Recipes",
  description: "Save recipes from Instagram and TikTok, manage your pantry, and plan meals with AI.",
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
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 text-gray-900 h-full flex flex-col overscroll-none`}>
        {/* Prevent pinch-to-zoom on iOS (viewport meta alone is ignored in PWA mode) */}
        <Script id="prevent-zoom" strategy="afterInteractive">{`
          document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
          document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
          document.addEventListener('touchmove', function(e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
        `}</Script>
        <Navbar />
        <main className="flex-1 overflow-y-auto overscroll-none pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">{children}</main>
        <BottomTabBar />
      </body>
    </html>
  );
}
