/**
 * Shared Web Audio context for music + SFX.
 * Critical on iOS: one unlocked context; never close it while the app runs.
 */

let shared: AudioContext | null = null;

function createContext(): AudioContext {
  return new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();
}

export function getSharedAudioContext(): AudioContext {
  if (!shared) {
    shared = createContext();
  }
  if (shared.state === "suspended") {
    void shared.resume().catch(() => {});
  }
  return shared;
}

/** Call from a user gesture (tap Unlock / first touch). */
export async function unlockSharedAudioContext(): Promise<AudioContext> {
  const ctx = getSharedAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  // Silent blip — required on some iOS versions to fully unlock
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch {
    /* ignore */
  }
  return ctx;
}

export function isSharedAudioUnlocked(): boolean {
  return !!shared && shared.state === "running";
}

/**
 * Resume a suspended shared context (iOS suspends on background).
 * No-op if context was never created or is already running.
 */
export async function resumeSharedAudioIfSuspended(): Promise<void> {
  if (!shared) return;
  if (shared.state === "suspended") {
    try {
      await shared.resume();
    } catch {
      /* ignore — next user gesture will unlock */
    }
  }
}
