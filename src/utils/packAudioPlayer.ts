/**
 * Pack sample player on the shared AudioContext.
 * Caches decoded buffers, honors master volume, supports stop by key/channel.
 */

import {
  getSharedAudioContext,
  unlockSharedAudioContext,
} from "./audioContext";

export type PackPlayOpts = {
  key?: string;
  channel?: string;
  /** 0–1 relative to master */
  gain?: number;
  loop?: boolean;
};

type ActiveVoice = {
  id: number;
  key?: string;
  channel?: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
};

class PackAudioPlayer {
  private bus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private volume = 0.85;
  private musicVolume = 0.5;
  private musicDuck = 1;
  private enabled = true;
  private buffers = new Map<string, AudioBuffer | Promise<AudioBuffer>>();
  private active = new Map<number, ActiveVoice>();
  private nextId = 1;

  private ensureBus(): GainNode | null {
    try {
      const ctx = getSharedAudioContext();
      if (!this.bus || this.bus.context !== ctx) {
        this.bus = ctx.createGain();
        this.bus.gain.value = this.volume;
        this.bus.connect(ctx.destination);
      }
      return this.bus;
    } catch {
      return null;
    }
  }

  private ensureMusicBus(): GainNode | null {
    try {
      const ctx = getSharedAudioContext();
      if (!this.musicBus || this.musicBus.context !== ctx) {
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = this.musicVolume * this.musicDuck;
        this.musicBus.connect(ctx.destination);
      }
      return this.musicBus;
    } catch {
      return null;
    }
  }

  private applyMusicGain() {
    if (this.musicBus) {
      this.musicBus.gain.value = this.musicVolume * this.musicDuck;
    }
  }

  async unlock(): Promise<void> {
    await unlockSharedAudioContext();
    this.ensureBus();
    this.ensureMusicBus();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.bus) this.bus.gain.value = this.volume;
  }

  getVolume() {
    return this.volume;
  }

  /** Music file-bed bus (independent of SFX volume). */
  setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.applyMusicGain();
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  /** Duck factor for music beds (1 = full, ~0.22–0.28 for speech). */
  setMusicDuckFactor(factor: number) {
    this.musicDuck = Math.max(0, Math.min(1, factor));
    this.applyMusicGain();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stopAll();
  }

  /** Decode + cache a sample URL (data: or https: or vite asset). */
  async load(url: string): Promise<AudioBuffer | null> {
    if (!url?.trim()) return null;
    const cached = this.buffers.get(url);
    if (cached) return cached instanceof Promise ? cached : cached;

    const pending = (async () => {
      const ctx = getSharedAudioContext();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`pack audio fetch ${res.status}`);
      const raw = await res.arrayBuffer();
      return await ctx.decodeAudioData(raw.slice(0));
    })();

    this.buffers.set(url, pending);
    try {
      const buf = await pending;
      this.buffers.set(url, buf);
      return buf;
    } catch {
      this.buffers.delete(url);
      return null;
    }
  }

  /** Decoded duration in ms, or null if unavailable. */
  async durationMs(url: string): Promise<number | null> {
    const buf = await this.load(url);
    if (!buf || !Number.isFinite(buf.duration)) return null;
    return Math.max(0, Math.round(buf.duration * 1000));
  }

  /**
   * Play a pack sample. Returns voice id, or null if decode/play failed.
   * Callers should fall back to oscillator SFX when null.
   */
  async play(url: string, opts: PackPlayOpts = {}): Promise<number | null> {
    if (!this.enabled || !url?.trim()) return null;
    await this.unlock();
    const isMusic = opts.channel === "music";
    const bus = isMusic ? this.ensureMusicBus() : this.ensureBus();
    if (!bus) return null;

    const buf = await this.load(url);
    if (!buf) return null;

    const ctx = getSharedAudioContext();
    if (ctx.state === "suspended") void ctx.resume();

    // One looping bed at a time
    if (isMusic) this.stop({ channel: "music" });

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = !!opts.loop;
    const gain = ctx.createGain();
    const level = Math.max(0, Math.min(1, opts.gain ?? 1));
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(bus);

    const id = this.nextId++;
    const voice: ActiveVoice = {
      id,
      key: opts.key,
      channel: opts.channel,
      source,
      gain,
    };
    this.active.set(id, voice);

    source.onended = () => {
      this.active.delete(id);
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };

    try {
      source.start(0);
      return id;
    } catch {
      this.active.delete(id);
      return null;
    }
  }

  /** Stop voices matching key and/or channel. Omit both → stop all. */
  stop(filter?: { key?: string; channel?: string }) {
    const key = filter?.key;
    const channel = filter?.channel;
    for (const voice of [...this.active.values()]) {
      const keyMatch = !key || voice.key === key;
      const chMatch = !channel || voice.channel === channel;
      if (!keyMatch || !chMatch) continue;
      try {
        voice.source.stop();
      } catch {
        /* already stopped */
      }
      this.active.delete(voice.id);
    }
  }

  stopAll() {
    this.stop();
  }

  /** Test helper */
  activeCount(): number {
    return this.active.size;
  }

  /** Test helper — clear decoded cache */
  clearCache() {
    this.buffers.clear();
  }
}

export const packAudioPlayer = new PackAudioPlayer();
