// Dynamic ambient music engine with evolving patterns
// This replaces the static oscillator drone with a more musical, less repetitive system

import { getSharedAudioContext } from "./audioContext";
import {
  AmbientSFXEngine,
  getAmbientSFXForLocation,
} from "./ambientSfxEngine";
import type { MusicTheme } from "./musicPresets";

// Chord progressions per mood (as scale degree indices)
const PROGRESSIONS: Record<string, number[][]> = {
  dark:   [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1], [0, 3, 5], [6, 1, 3]],
  calm:   [[0, 2, 4], [3, 5, 0], [5, 0, 2], [2, 4, 6], [4, 6, 1], [0, 4, 5]],
  tense:  [[0, 2, 4], [6, 1, 3], [5, 0, 2], [3, 5, 7], [1, 3, 5], [4, 6, 0]],
  upbeat: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1], [2, 4, 6], [5, 0, 3]],
  eerie:  [[0, 1, 4], [5, 0, 3], [3, 6, 1], [1, 4, 6], [6, 2, 4], [0, 3, 6]],
};

export class AmbientMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private theme: MusicTheme;
  private isRunning = false;
  private schedulerTimer: number | null = null;
  private activeNodes: AudioNode[] = [];
  private chordIndex = 0;
  private beatCount = 0;
  private volume = 0.5;
  private sfxEngine: AmbientSFXEngine | null = null;
  private currentLocation = '';
  /** Owns nodes on the shared context — never close the shared AudioContext */
  private usesSharedContext = true;

  // Layers
  private droneOscs: OscillatorNode[] = [];
  private droneGains: GainNode[] = [];

  constructor(theme: MusicTheme) {
    this.theme = theme;
  }

  start(volume: number, location = '') {
    if (this.isRunning) return;
    this.volume = volume;
    this.isRunning = true;
    this.currentLocation = location;

    this.ctx = getSharedAudioContext();
    this.usesSharedContext = true;

    // Master chain: gain -> filter -> destination
    this.masterGain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.theme.filterFreq;
    this.filter.Q.value = 0.7;

    this.masterGain.connect(this.filter);
    this.filter.connect(this.ctx.destination);

    // Separate lower-volume gain bus for ambient SFX
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.sfxGain.gain.linearRampToValueAtTime(volume * 0.12, this.ctx.currentTime + 2);
    this.sfxGain.connect(this.ctx.destination);

    // Fade in music (slightly quicker for mobile feel)
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume * 0.18, this.ctx.currentTime + 1.5);

    // Start layers
    this.startDroneLayer();
    this.startPulseScheduler();
    this.startAmbientSFX(location);
  }

  setAmbientLocation(location: string) {
    if (location === this.currentLocation) return;
    this.currentLocation = location;
    // Stop previous SFX
    if (this.sfxEngine) {
      this.sfxEngine.stop();
      this.sfxEngine = null;
    }
    // Start new SFX after a short delay to let crossfade settle
    setTimeout(() => this.startAmbientSFX(location), 2000);
  }

  private startAmbientSFX(location: string) {
    if (!this.ctx || !this.sfxGain) return;
    const sfxType = getAmbientSFXForLocation(location);
    if (sfxType === 'none') return;
    this.sfxEngine = new AmbientSFXEngine(this.ctx, this.sfxGain, sfxType);
    this.sfxEngine.start();
  }

  stop() {
    if (!this.isRunning || !this.ctx) return;
    this.isRunning = false;

    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    if (this.sfxEngine) {
      this.sfxEngine.stop();
      this.sfxEngine = null;
    }

    const ctx = this.ctx;
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    }

    setTimeout(() => {
      this.droneOscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      this.droneOscs = [];
      this.droneGains = [];
      this.activeNodes.forEach((n) => {
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      });
      this.activeNodes = [];
      try {
        this.masterGain?.disconnect();
        this.filter?.disconnect();
        this.sfxGain?.disconnect();
      } catch {
        /* ignore */
      }
      // Never close the shared AudioContext (iOS / Capacitor)
      if (!this.usesSharedContext) {
        void ctx.close();
      }
    }, 1600);

    this.ctx = null;
    this.masterGain = null;
    this.filter = null;
    this.sfxGain = null;
  }

  setVolume(v: number) {
    this.volume = v;
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.3;
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(v * 0.18, t);
    }
    // Keep ambient bed proportional to music volume (was stuck at start level).
    if (this.sfxGain) {
      this.sfxGain.gain.linearRampToValueAtTime(v * 0.12, t);
    }
  }

  /**
   * Temporary music duck (speech / VO). Ambient bed ducks softer.
   * Pass factor 1 to restore.
   */
  setDuckFactor(factor: number, rampSec = 0.25) {
    if (!this.ctx || !this.masterGain) return;
    const f = Math.max(0.05, Math.min(1, factor));
    const t = this.ctx.currentTime + Math.max(0.05, rampSec);
    this.masterGain.gain.linearRampToValueAtTime(this.volume * 0.18 * f, t);
    if (this.sfxGain) {
      const amb = 0.35 + 0.65 * f; // ambient ducks less than music
      this.sfxGain.gain.linearRampToValueAtTime(this.volume * 0.12 * amb, t);
    }
  }

  crossfadeTo(newTheme: MusicTheme, duration = 4) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Fade out current filter freq and fade in new one
    if (this.filter) {
      this.filter.frequency.linearRampToValueAtTime(newTheme.filterFreq, ctx.currentTime + duration);
    }

    // Smoothly retune drone oscillators to new chord
    const chord = this.getChordFreqs(newTheme, 0);
    this.droneOscs.forEach((osc, i) => {
      const targetFreq = i < chord.length ? chord[i] : chord[0] * (i === 3 ? 0.5 : 2);
      osc.frequency.linearRampToValueAtTime(targetFreq, ctx.currentTime + duration);
    });

    this.theme = newTheme;
    this.chordIndex = 0;
  }

  private getChordFreqs(theme: MusicTheme, chordIdx: number): number[] {
    const progression = PROGRESSIONS[theme.mood] || PROGRESSIONS.calm;
    const degrees = progression[chordIdx % progression.length];
    return degrees.map(d => {
      const scaleIdx = d % theme.scale.length;
      const octave = Math.floor(d / theme.scale.length);
      return theme.baseNote * theme.scale[scaleIdx] * Math.pow(2, octave);
    });
  }

  private startDroneLayer() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const chord = this.getChordFreqs(this.theme, 0);

    // Create 4 drone voices: 3 chord tones + 1 sub-bass
    const voiceConfigs = [
      { freq: chord[0] * 0.5, gain: 0.3, type: 'sine' as OscillatorType },   // sub
      { freq: chord[0], gain: 0.2, type: 'sine' as OscillatorType },          // root
      { freq: chord[1] || chord[0] * 1.5, gain: 0.12, type: 'sine' as OscillatorType },  // third
      { freq: chord[2] || chord[0] * 2, gain: 0.08, type: 'triangle' as OscillatorType }, // fifth
    ];

    voiceConfigs.forEach(vc => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = vc.type;
      osc.frequency.value = vc.freq;

      // Each voice gets a slightly different LFO rate for organic movement
      lfo.type = 'sine';
      lfo.frequency.value = 0.02 + Math.random() * 0.08;
      lfoGain.gain.value = vc.freq * 0.008; // subtle pitch wobble
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.value = vc.gain;
      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(ctx.currentTime);
      lfo.start(ctx.currentTime);

      this.droneOscs.push(osc);
      this.droneGains.push(gain);
      this.activeNodes.push(lfo, lfoGain);
    });
  }

  private startPulseScheduler() {
    // Schedule evolving musical events
    const beatInterval = (60 / (this.theme.tempo * 60)) * 1000; // ms per "beat"
    const chordChangeBeats = 8 + Math.floor(Math.random() * 8); // change chord every 8-16 beats

    this.schedulerTimer = window.setInterval(() => {
      if (!this.ctx || !this.isRunning) return;
      this.beatCount++;

      // Chord progression: advance every N beats
      if (this.beatCount % chordChangeBeats === 0) {
        this.advanceChord();
      }

      // Melodic ping: play a random scale tone occasionally
      if (Math.random() < this.theme.density * 0.3) {
        this.playMelodicPing();
      }

      // Texture hit: percussive noise burst
      if (Math.random() < this.theme.density * 0.15) {
        this.playTextureHit();
      }

      // Ghost note: very quiet high tone
      if (Math.random() < 0.1) {
        this.playGhostNote();
      }

      // Evolve filter slightly
      if (this.filter && Math.random() < 0.2) {
        const variation = this.theme.filterFreq * (0.8 + Math.random() * 0.4);
        this.filter.frequency.linearRampToValueAtTime(variation, this.ctx.currentTime + 2);
      }
    }, beatInterval);
  }

  private advanceChord() {
    if (!this.ctx) return;
    const progression = PROGRESSIONS[this.theme.mood] || PROGRESSIONS.calm;
    this.chordIndex = (this.chordIndex + 1) % progression.length;
    const chord = this.getChordFreqs(this.theme, this.chordIndex);

    // Smoothly glide drone oscillators to new chord
    const glideTime = 2 + Math.random() * 3;
    this.droneOscs.forEach((osc, i) => {
      let targetFreq: number;
      if (i === 0) targetFreq = chord[0] * 0.5; // sub stays an octave below
      else if (i < chord.length + 1) targetFreq = chord[i - 1];
      else targetFreq = chord[0] * 2;
      osc.frequency.linearRampToValueAtTime(targetFreq, this.ctx!.currentTime + glideTime);
    });

    // Swell the drone slightly on chord changes
    this.droneGains.forEach(g => {
      const cur = g.gain.value;
      g.gain.linearRampToValueAtTime(cur * 1.3, this.ctx!.currentTime + 0.5);
      g.gain.linearRampToValueAtTime(cur, this.ctx!.currentTime + 2);
    });
  }

  private playMelodicPing() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const scaleIdx = Math.floor(Math.random() * this.theme.scale.length);
    const octave = Math.random() < 0.5 ? 2 : 3;
    const freq = this.theme.baseNote * this.theme.scale[scaleIdx] * Math.pow(2, octave - 1);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
    osc.frequency.value = freq;

    const duration = 1 + Math.random() * 3;
    const attack = 0.05 + Math.random() * 0.2;
    const maxGain = 0.04 + Math.random() * 0.04;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(maxGain, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);
  }

  private playTextureHit() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Filtered noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 200 + Math.random() * 800;
    noiseFilter.Q.value = 2 + Math.random() * 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    source.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.masterGain);

    source.start(ctx.currentTime);
  }

  private playGhostNote() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const chord = this.getChordFreqs(this.theme, this.chordIndex);
    const freq = chord[Math.floor(Math.random() * chord.length)] * 4; // two octaves up

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const dur = 2 + Math.random() * 4;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.1);
  }
}
