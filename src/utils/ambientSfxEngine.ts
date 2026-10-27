// --- Ambient SFX definitions per location group ---
export type AmbientSFXType = 'rain' | 'crowd' | 'drip' | 'wind' | 'hum' | 'static' | 'none';

export const getAmbientSFXForLocation = (location: string): AmbientSFXType => {
  // Allow passing a resolved AmbientSFXType through setAmbientLocation
  if (
    location === "rain" ||
    location === "crowd" ||
    location === "drip" ||
    location === "wind" ||
    location === "hum" ||
    location === "static" ||
    location === "none"
  ) {
    return location;
  }
  if (
    location.includes("alley") ||
    location.includes("nightstreet") ||
    location.includes("park") ||
    location.includes("venuefront")
  ) {
    return "rain";
  }
  if (location.includes("concert")) return "crowd";
  if (location.includes("sewer")) return "drip";
  if (location.includes("warehouse")) return "wind";
  if (location.includes("computerlab")) return "hum";
  return "none";
};

export class AmbientSFXEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private sfxNodes: AudioNode[] = [];
  private timers: number[] = [];
  private type: AmbientSFXType;

  constructor(ctx: AudioContext, masterGain: GainNode, type: AmbientSFXType) {
    this.ctx = ctx;
    this.masterGain = masterGain;
    this.type = type;
  }

  start() {
    switch (this.type) {
      case 'rain': this.startRain(); break;
      case 'crowd': this.startCrowd(); break;
      case 'drip': this.startDrip(); break;
      case 'wind': this.startWind(); break;
      case 'hum': this.startHum(); break;
      case 'static': this.startStatic(); break;
    }
  }

  stop() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.sfxNodes.forEach((n) => {
      try {
        if ("stop" in n && typeof (n as AudioScheduledSourceNode).stop === "function") {
          (n as AudioScheduledSourceNode).stop();
        }
      } catch {
        /* node already stopped */
      }
    });
    this.sfxNodes = [];
  }

  private makeNoise(durationSec: number, filterType: BiquadFilterType, filterFreq: number, q: number, gainVal: number): void {
    const ctx = this.ctx;
    const bufSize = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const flt = ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.value = filterFreq;
    flt.Q.value = q;

    const g = ctx.createGain();
    g.gain.value = gainVal;

    src.connect(flt);
    flt.connect(g);
    g.connect(this.masterGain);
    src.start();

    this.sfxNodes.push(src, flt, g);
  }

  private startRain() {
    // Continuous high-frequency noise — soft rain
    this.makeNoise(2, 'highpass', 3500, 0.5, 0.04);
    // Occasional mid-burst — heavier drops
    this.makeNoise(2, 'bandpass', 1200, 1.5, 0.018);
  }

  private startCrowd() {
    // Low rumble of crowd chatter — dense bandpass noise
    this.makeNoise(3, 'bandpass', 400, 0.8, 0.05);
    // High shimmer — clapping, glasses
    this.makeNoise(3, 'bandpass', 2500, 2.0, 0.015);
  }

  private startDrip() {
    // Ambient cave reverb — lowpass noise
    this.makeNoise(2, 'lowpass', 600, 1.0, 0.025);
    // Schedule periodic drip pings
    const scheduleDrip = () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 900 + Math.random() * 400;
      g.gain.setValueAtTime(0.06, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
      this.sfxNodes.push(osc, g);
      const delay = 1200 + Math.random() * 3000;
      const t = window.setTimeout(scheduleDrip, delay);
      this.timers.push(t);
    };
    scheduleDrip();
  }

  private startWind() {
    // Slow-sweeping bandpass noise — wind through cracks
    this.makeNoise(3, 'bandpass', 300, 0.4, 0.035);
    this.makeNoise(3, 'highpass', 2000, 0.8, 0.012);
  }

  private startHum() {
    // Electrical 60Hz hum — computers
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 60;
    g.gain.value = 0.03;
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    this.sfxNodes.push(osc, g);

    // Higher harmonic
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 120;
    g2.gain.value = 0.012;
    osc2.connect(g2);
    g2.connect(this.masterGain);
    osc2.start();
    this.sfxNodes.push(osc2, g2);
  }

  private startStatic() {
    // Quiet shortwave radio static
    this.makeNoise(2, 'bandpass', 1500, 3.0, 0.025);
    // Occasional crackle
    const scheduleCrackle = () => {
      if (!this.ctx) return;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.04;
      src.connect(g);
      g.connect(this.masterGain);
      src.start();
      this.sfxNodes.push(src, g);
      const delay = 800 + Math.random() * 4000;
      const t = window.setTimeout(scheduleCrackle, delay);
      this.timers.push(t);
    };
    scheduleCrackle();
  }
}
