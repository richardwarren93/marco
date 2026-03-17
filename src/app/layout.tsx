import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import BottomTabBar from "@/components/layout/BottomTabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marco - Save & Plan Recipes",
  description: "Save recipes from Instagram and TikTok, manage your pantry, and plan meals with AI.",
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
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 text-gray-900`}>
        <Navbar />
        <main className="pb-20 sm:pb-0">{children}</main>
        <BottomTabBar />
      </body>
    </html>
  );
}
