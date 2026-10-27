import {
  getSharedAudioContext,
  unlockSharedAudioContext,
} from "./audioContext";

/**
 * One-shot UI / world SFX on the shared AudioContext (iOS-safe).
 */
class SoundEffects {
  private enabled = true;
  private unlocked = false;
  private masterGain: GainNode | null = null;
  private volume = 0.85;

  private ensureGain(): GainNode | null {
    try {
      const ctx = getSharedAudioContext();
      if (!this.masterGain || this.masterGain.context !== ctx) {
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(ctx.destination);
      }
      return this.masterGain;
    } catch {
      return null;
    }
  }

  private createOscillator(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    gainScale = 1
  ) {
    if (!this.enabled) return;
    const ctx = getSharedAudioContext();
    const bus = this.ensureGain();
    if (!bus) return;

    try {
      if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(bus);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const peak = 0.12 * gainScale;
      gainNode.gain.setValueAtTime(peak, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + duration
      );

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      /* ignore */
    }
  }

  async unlock(): Promise<void> {
    await unlockSharedAudioContext();
    this.unlocked = true;
    this.ensureGain();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getVolume() {
    return this.volume;
  }

  click() {
    this.createOscillator(800, 0.05, "square");
  }

  verbSelect() {
    this.createOscillator(600, 0.08, "sine");
  }

  pickup() {
    if (!this.enabled) return;
    this.createOscillator(400, 0.1, "triangle");
    setTimeout(() => this.createOscillator(600, 0.1, "triangle"), 50);
  }

  success() {
    if (!this.enabled) return;
    this.createOscillator(523, 0.1, "sine");
    setTimeout(() => this.createOscillator(659, 0.1, "sine"), 100);
    setTimeout(() => this.createOscillator(784, 0.15, "sine"), 200);
  }

  error() {
    if (!this.enabled) return;
    this.createOscillator(200, 0.2, "sawtooth");
  }

  doorOpen() {
    if (!this.enabled) return;
    for (let i = 0; i < 10; i++) {
      setTimeout(
        () => this.createOscillator(100 + i * 20, 0.05, "sawtooth", 0.7),
        i * 30
      );
    }
  }

  creak() {
    if (!this.enabled) return;
    this.createOscillator(90, 0.18, "sawtooth");
    setTimeout(() => this.createOscillator(70, 0.22, "triangle"), 80);
  }

  /** Script sound opcode keys → built-in SFX */
  playKey(key: string) {
    switch (key) {
      case "click":
        this.click();
        break;
      case "pickup":
        this.pickup();
        break;
      case "success":
        this.success();
        break;
      case "error":
        this.error();
        break;
      case "door":
      case "doorOpen":
        this.doorOpen();
        break;
      case "creak":
      case "floorboard":
        this.creak();
        break;
      case "verb":
        this.verbSelect();
        break;
      default:
        this.createOscillator(440, 0.08, "sine");
        break;
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }

  isReady(): boolean {
    return this.unlocked;
  }
}

export const soundFX = new SoundEffects();
