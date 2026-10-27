import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor shell — same Vite `dist/` for web and native.
 * See CAPACITOR.md.
 */

const config: CapacitorConfig = {
  appId: "com.portableadventure.engine",
  appName: "Portable Adventure",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#1a1a2e",
  },
  android: {
    backgroundColor: "#1a1a2e",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: "#1a1a2e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
