"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// Routes `marco://…` deep links into the web app.
//
// Today the only producer is the iOS Share Extension
// (ios/App/ShareExtension), which sends `marco://import?url=<shared link>`
// when someone shares a TikTok/Instagram/recipe-site link into Marco. We
// forward it to /recipes/new?url=… where the existing extract flow takes over
// using the WebView's already-authenticated session.
//
// On web: no-op. The Capacitor modules are dynamic-imported so their native
// bindings never load in browser bundles (same pattern as
// PushNotificationManager).

const PENDING_KEY = "marco_pending_import";
// A shared link is only worth resuming for so long — past this we assume the
// user moved on and a surprise import screen would just be confusing.
const PENDING_TTL_MS = 60 * 60 * 1000;

type Pending = { url: string; at: number };

function readPending(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pending;
    if (!parsed?.url || Date.now() - parsed.at > PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed.url;
  } catch {
    return null;
  }
}

function writePending(url: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ url, at: Date.now() } satisfies Pending));
  } catch {
    // Private mode / quota — the in-flight navigation below still works, we
    // just lose the ability to resume across a sign-in bounce.
  }
}

// Ids of shares already handled this session. The native side may deliver the
// same share more than once: the extension both queues it in the App Group and
// fires the deep link, and AppDelegate re-posts a drained item after 4s in case
// the first post beat the listener below into existence. Every delivery carries
// the id the extension generated, so dropping repeats is exact rather than
// heuristic.
const handledIds = new Set<string>();

type ParsedImport = { url: string; id: string | null };

/** Pulls the `url` and `id` params out of a `marco://import?url=…` deep link. */
function parseImportUrl(deepLink: string): ParsedImport | null {
  try {
    const parsed = new URL(deepLink);
    if (parsed.protocol !== "marco:") return null;
    // `marco://import?url=…` parses with host === "import"; be lenient about
    // a path-style `marco:/import` too.
    const target = parsed.host || parsed.pathname.replace(/^\/+/, "");
    if (target !== "import") return null;
    const shared = parsed.searchParams.get("url");
    if (!shared) return null;
    // Only http(s) — anything else can't be scraped and shouldn't be echoed
    // into a navigation.
    const sharedUrl = new URL(shared);
    if (sharedUrl.protocol !== "http:" && sharedUrl.protocol !== "https:") return null;
    return { url: sharedUrl.toString(), id: parsed.searchParams.get("id") };
  } catch {
    return null;
  }
}

export default function DeepLinkHandler() {
  const router = useRouter();
  const pathname = usePathname();
  // Guards the resume path so a single mount can't push twice.
  const resuming = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    function go(shared: ParsedImport) {
      if (shared.id) {
        if (handledIds.has(shared.id)) return;
        handledIds.add(shared.id);
      }
      writePending(shared.url);
      router.push(`/recipes/new?url=${encodeURIComponent(shared.url)}`);
    }

    async function init() {
      const { Capacitor } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/core"
      );
      if (!Capacitor.isNativePlatform() || cancelled) return;

      const { App } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ "@capacitor/app"
      );

      // Warm start: app already running when the share sheet fires.
      const listener = await App.addListener("appUrlOpen", (event) => {
        const shared = parseImportUrl(event.url);
        if (shared) go(shared);
      });
      removeListener = () => listener.remove();

      // Cold start: the launch URL is consumed before any JS listener exists,
      // so `appUrlOpen` never fires for it.
      const launch = await App.getLaunchUrl();
      if (launch?.url && !cancelled) {
        const shared = parseImportUrl(launch.url);
        if (shared) go(shared);
      }
    }

    init();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  // Resume an import that got interrupted by the auth bounce. A signed-out
  // user deep-linking to /recipes/new hits middleware and lands on
  // /auth/login (or /onboarding), losing the shared URL from the address bar
  // — but not from localStorage. Once they're back on a real page, pick it up.
  //
  // Deliberately skipped while on /auth or /onboarding: pushing there would
  // bounce straight back and spin.
  useEffect(() => {
    if (resuming.current) return;
    if (!pathname || pathname.startsWith("/auth") || pathname.startsWith("/onboarding")) return;
    if (pathname.startsWith("/recipes/new")) return; // already there — it consumes the key

    const pending = readPending();
    if (!pending) return;

    resuming.current = true;
    router.push(`/recipes/new?url=${encodeURIComponent(pending)}`);
  }, [pathname, router]);

  return null;
}

export { PENDING_KEY };
