import type { CapacitorConfig } from "@capacitor/cli";

// Marco mobile shell.
//
// Strategy: ship a thin native shell that loads the production web app from
// Vercel. The Next.js app stays unchanged for web users; mobile users get
// the same experience plus native plugins (push, share, haptics) layered on
// top. This avoids the cost of switching the whole app to `output: 'export'`
// and keeps web/mobile in sync automatically — every Vercel deploy ships to
// the in-flight app instances.
//
// Apple guideline 4.2 ("don't be a website wrapper") is satisfied via the
// native plugins added in Phase 2/3: push notifications, share extension,
// haptics, status bar styling, splash screen. Without those a webview-only
// build will get rejected.

const config: CapacitorConfig = {
  appId: "com.ACGC.crave",
  appName: "Salt & Spoon",
  // The local `webDir` exists for the case where we ever bundle a static
  // shell. For now the app loads `server.url` directly, so this points at
  // a placeholder build output that we'll generate on demand.
  webDir: "out",
  server: {
    url: "https://marco-eta-lyart.vercel.app",
    cleartext: false,
  },
  ios: {
    // `never` lets the WebView extend behind the status bar / home
    // indicator. Combined with `overlaysWebView: true` on the StatusBar
    // plugin, this gives the web layer a single source of truth for
    // safe areas: env(safe-area-inset-*). Previously `always` plus
    // `overlaysWebView: false` produced double-padding at the top
    // because both native chrome and CSS env() reserved the same space.
    contentInset: "never",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Cream background matches the brand palette so the splash
      // doesn't flash white before the web app paints. Auto-hide once
      // the WebView has finished loading the home page.
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#F5EEE2",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Background is cream (#F5EEE2 — light). Status bar text needs to
      // be DARK to be readable. Capacitor's `Dark` style means dark
      // icons/text (counterintuitive naming — `Light` means light text
      // for dark backgrounds). Prior `LIGHT` rendered near-invisible.
      style: "DARK",
      // With `overlaysWebView: true` the WebView paints behind the
      // status bar area. The body's cream background shows through;
      // the StatusBar.backgroundColor here is only used as a fallback
      // on Android when the WebView doesn't paint that region.
      backgroundColor: "#F5EEE2",
      overlaysWebView: true,
    },
  },
};

export default config;
