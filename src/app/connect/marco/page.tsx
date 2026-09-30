import { Suspense } from "react";
import type { Viewport } from "next";
import Consent from "./consent";

export const metadata = { title: "Connect Marco" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true };

export default function ConnectMarcoPage() {
  return <div className="mx-auto max-w-lg px-6 py-12">
    <h1 className="font-serif text-4xl mb-3">Connect Marco</h1>
    <p className="mb-8">Bring your saved cooking plans into your conversation.</p>
    <Suspense fallback={<p role="status">Loading connection…</p>}><Consent /></Suspense>
  </div>;
}
