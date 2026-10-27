import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import type { HapticStyle } from "@/engine/haptics";

/**
 * Haptic feedback for native (Capacitor) and a light web fallback
 * via `navigator.vibrate` where supported (Android Chrome, etc.).
 */
class HapticFeedback {
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  private vibrate(pattern: number | number[]) {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }

  /** Play a pack/engine haptic style (preferred entry for host wiring). */
  async play(style: HapticStyle): Promise<void> {
    switch (style) {
      case "light":
        return this.light();
      case "medium":
        return this.medium();
      case "heavy":
        return this.heavy();
      case "success":
        return this.success();
      case "warning":
        return this.warning();
      case "error":
        return this.error();
      case "selection":
        return this.selection();
      default:
        return;
    }
  }

  async light(): Promise<void> {
    if (!this.isNative) {
      this.vibrate(10);
      return;
    }
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }

  async medium(): Promise<void> {
    if (!this.isNative) {
      this.vibrate(20);
      return;
    }
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }

  async heavy(): Promise<void> {
    if (!this.isNative) {
      this.vibrate(35);
      return;
    }
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }

  async success(): Promise<void> {
    if (!this.isNative) {
      this.vibrate([12, 40, 18]);
      return;
    }
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }

  async warning(): Promise<void> {
    if (!this.isNative) {
      this.vibrate([18, 30, 18]);
      return;
    }
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }

  async error(): Promise<void> {
    if (!this.isNative) {
      this.vibrate([30, 40, 30, 40, 40]);
      return;
    }
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }

  async selection(): Promise<void> {
    if (!this.isNative) {
      this.vibrate(8);
      return;
    }
    try {
      await Haptics.selectionChanged();
    } catch (e) {
      console.warn("Haptics not available:", e);
    }
  }
}

export const haptics = new HapticFeedback();
