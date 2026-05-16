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
  appId: "app.marco.mobile",
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
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Cream background matches the Marco brand palette so the splash
      // doesn't flash white before the web app paints. Auto-hide once the
      // WebView has finished loading the home page.
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
      // Light content (dark text) since the Marco background is cream.
      style: "LIGHT",
      backgroundColor: "#F5EEE2",
      overlaysWebView: false,
    },
  },
};

export default config;
