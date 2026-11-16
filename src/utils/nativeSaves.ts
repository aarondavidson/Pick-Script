import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { createKeyValueSaveMirror, setSaveMirror } from "@/engine";

/**
 * Native apps (Capacitor iOS / Android): keep saves in the device's native
 * key-value storage as well as the web view's storage, which the OS may
 * clear. No-op in a browser. Call once before the app renders.
 */
export function installNativeSaveStorage(): void {
  if (!Capacitor.isNativePlatform()) return;
  setSaveMirror(createKeyValueSaveMirror(Preferences, "device"));
}
