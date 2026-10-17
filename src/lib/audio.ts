// Shared Web Audio context + the music engine that plays previews (or a procedural synth fallback)
// through a filter chain the sabotage/buff cards can manipulate.

import { getApiUrl } from './net';

let ctx: AudioContext | null = null;
export function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isAudioSuspended(): boolean {
  return ctx ? ctx.state === 'suspended' : false;
}

export function unlockAudio() {
  const c = getCtx();
  if (c.state === 'suspended') {
    void c.resume().then(() => {
      music.resumeIfSuspended();
    });
  } else {
    music.resumeIfSuspended();
  }
}

if (typeof window !== 'undefined') {
  const onUserGesture = () => {
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        music.resumeIfSuspended();
      });
    }
  };
  window.addEventListener('pointerdown', onUserGesture, true);
  window.addEventListener('keydown', onUserGesture, true);
  window.addEventListener('touchstart', onUserGesture, true);
  window.addEventListener('click', onUserGesture, true);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export interface PlayParams {
  previewUrl?: string;
  seed: number;
  offset: number;
}
export interface FxState {
  vinyl: boolean;
  glitch: boolean;
  clarity: boolean;
}

class MusicEngine {
  analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private trackGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private el: HTMLAudioElement | null = null;
  private elSource: MediaElementAudioSourceNode | null = null;
  private synthTimer: number | null = null;
  private fxTimer: number | null = null;
  private fallbackTimer: number | null = null;
  private fadeTimer: number | null = null;
  private fx: FxState = { vinyl: false, glitch: false, clarity: false };
  private token = 0;
  private prepared: { params: PlayParams; token: number } | null = null;
  private synthOn = false;
  private listeners = new Set<(vol: number, reduced: boolean) => void>();
  volume = Number(localStorage.getItem('sq.vol') ?? '0.8');
  isReduced = false;
  private prevVolume = this.volume;
  usingSynth = false;
  isPlaying = false;

  private init() {
    if (this.master) return;
    const c = getCtx();
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.78;
    this.master = c.createGain();
    this.master.gain.value = this.volume;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.trackGain = c.createGain();
    this.trackGain.connect(this.filter);
    this.filter.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(c.destination);

    // Looping noise bed used for vinyl crackle + VHS static.
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 4 : 0.35);
    const noise = c.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    this.noiseFilter = c.createBiquadFilter();
    this.noiseFilter.type = 'highpass';
    this.noiseFilter.frequency.value = 1500;
    this.noiseGain = c.createGain();
    this.noiseGain.gain.value = 0;
    noise.connect(this.noiseFilter).connect(this.noiseGain).connect(this.master);
    noise.start();
  }

  subscribe(listener: (vol: number, reduced: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.volume, this.isReduced));
  }

  setVolume(v: number) {
    const val = Math.max(0, Math.min(1, v));
    this.volume = val;
    if (!this.isReduced) this.prevVolume = val;
    localStorage.setItem('sq.vol', String(val));
    if (this.master) {
      const c = getCtx();
      this.master.gain.cancelScheduledValues(c.currentTime);
      this.master.gain.setValueAtTime(val, c.currentTime);
    }
    this.notify();
  }

  /** Quick Volume Reduction system: drops volume by 50% for hearing voice/friends or focus */
  toggleReduction() {
    if (this.isReduced) {
      this.isReduced = false;
      this.setVolume(this.prevVolume || 0.8);
    } else {
      this.prevVolume = this.volume;
      this.isReduced = true;
      this.setVolume(Math.max(0.1, this.volume * 0.45));
    }
  }

  /** Resume audio context and HTML5 media element if suspended by browser autoplay policy */
  resumeIfSuspended() {
    if (!this.isPlaying) return;
    const c = getCtx();
    if (c.state === 'suspended') {
      void c.resume();
    }
    if (this.el && this.el.paused) {
      this.el.play().catch(() => {});
    }
    if (this.trackGain && c) {
      this.trackGain.gain.setValueAtTime(this.fx.clarity ? 1.45 : 1, c.currentTime);
    }
  }

  /** Begin buffering a track (call during the countdown). */
  prepare(params: PlayParams) {
    this.stop();
    this.init();
    const token = ++this.token;
    this.prepared = { params, token };
    if (params.previewUrl) {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.loop = true;
      (el as any).preservesPitch = false;
      el.src = getApiUrl(`/api/preview?url=${encodeURIComponent(params.previewUrl)}`);
      el.addEventListener('loadedmetadata', () => {
        if (isFinite(el.duration)) el.currentTime = Math.min(params.offset, Math.max(0, el.duration - 6));
      });
      el.addEventListener('error', () => {
        if (this.token === token && this.el === el) this.switchToSynth(token);
      });
      this.el = el;
      this.elSource = getCtx().createMediaElementSource(el);
      this.elSource.connect(this.trackGain!);
    }
  }

  /** Start audible playback (answer window opens). */
  start(params: PlayParams) {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (!this.prepared || this.prepared.params.seed !== params.seed) this.prepare(params);
    const token = this.token;
    this.isPlaying = true;
    const c = getCtx();
    if (this.trackGain) {
      this.trackGain.gain.cancelScheduledValues(c.currentTime);
      this.trackGain.gain.setValueAtTime(this.fx.clarity ? 1.45 : 1, c.currentTime);
    }
    this.applyFx();
    if (this.el) {
      const el = this.el;
      el.play().catch(() => this.token === token && this.switchToSynth(token));
      // If the preview hasn't started within 3.5s, fall back so players always hear something.
      this.fallbackTimer = window.setTimeout(() => {
        if (this.token === token && this.el === el && (el.paused || el.readyState < 2)) this.switchToSynth(token);
      }, 3500);
    } else this.switchToSynth(token);
  }

  private switchToSynth(token: number) {
    if (this.token !== token || this.synthOn) return;
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute('src');
      this.el = null;
    }
    this.elSource?.disconnect();
    this.elSource = null;
    this.startSynth(this.prepared?.params.seed ?? 1);
  }

  stop() {
    this.token++;
    this.isPlaying = false;
    this.prepared = null;
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.fxTimer) {
      clearInterval(this.fxTimer);
      this.fxTimer = null;
    }
    if (this.trackGain && ctx) {
      try {
        this.trackGain.gain.cancelScheduledValues(ctx.currentTime);
        this.trackGain.gain.setValueAtTime(0, ctx.currentTime);
      } catch {}
    }
    if (this.el) {
      try {
        this.el.pause();
        this.el.currentTime = 0;
        this.el.removeAttribute('src');
        this.el.load();
      } catch {}
      this.el = null;
    }
    this.elSource?.disconnect();
    this.elSource = null;
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    this.synthOn = false;
    this.usingSynth = false;
    this.fx = { vinyl: false, glitch: false, clarity: false };
    if (this.filter && ctx) {
      try {
        this.filter.frequency.setValueAtTime(20000, ctx.currentTime);
      } catch {}
    }
    if (this.noiseGain && ctx) {
      try {
        this.noiseGain.gain.setValueAtTime(0, ctx.currentTime);
      } catch {}
    }
  }

  /** Fade out softly (used at reveal so the answer moment breathes). */
  fadeOut(ms = 600) {
    this.isPlaying = false;
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (!this.trackGain) {
      this.stop();
      return;
    }
    const c = getCtx();
    const g = this.trackGain.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    this.fadeTimer = window.setTimeout(() => {
      this.stop();
      this.fadeTimer = null;
    }, ms + 40);
  }

  setFx(fx: FxState) {
    this.fx = fx;
    this.applyFx();
  }

  private applyFx() {
    if (!this.master || !this.trackGain || !this.filter || !this.noiseGain || !this.noiseFilter) return;
    const c = getCtx();
    const { vinyl, glitch, clarity } = this.fx;

    this.trackGain.gain.cancelScheduledValues(c.currentTime);
    this.trackGain.gain.setValueAtTime(this.trackGain.gain.value, c.currentTime);
    this.trackGain.gain.setTargetAtTime(clarity ? 1.45 : 1, c.currentTime, 0.05);

    this.filter.frequency.cancelScheduledValues(c.currentTime);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value, c.currentTime);
    this.filter.frequency.setTargetAtTime(vinyl && !clarity ? 3800 : 20000, c.currentTime, 0.1);

    this.noiseFilter.type = glitch ? 'bandpass' : 'highpass';
    this.noiseFilter.frequency.setValueAtTime(glitch ? 2400 : 1500, c.currentTime);

    this.noiseGain.gain.cancelScheduledValues(c.currentTime);
    this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, c.currentTime);
    this.noiseGain.gain.setTargetAtTime(clarity ? 0 : glitch ? 0.12 : vinyl ? 0.05 : 0, c.currentTime, 0.05);

    if (this.fxTimer) {
      clearInterval(this.fxTimer);
      this.fxTimer = null;
    }
    if (this.el) this.el.playbackRate = 1;

    if ((vinyl || glitch) && !clarity) {
      let t = 0;
      this.fxTimer = window.setInterval(() => {
        t += 0.12;
        // Vinyl pitch flutter: safe playbackRate modulation without seeking backwards
        if (vinyl && this.el) {
          const flutter = 1.0 + 0.06 * Math.sin(t * 2.8) + (Math.random() - 0.5) * 0.03;
          this.el.playbackRate = Math.max(0.85, Math.min(1.15, flutter));
        }
        // Glitch: safe filter frequency modulation without muting or throwing errors
        if (glitch && this.filter && ctx) {
          if (Math.random() < 0.3) {
            const f = 800 + Math.random() * 4500;
            this.filter.frequency.setValueAtTime(f, ctx.currentTime);
          }
        }
      }, 100);
    }
  }

  // ───────── Procedural synth fallback ─────────
  private startSynth(seed: number) {
    this.synthOn = true;
    this.usingSynth = true;
    const c = getCtx();
    const out = this.trackGain!;
    const rng = mulberry32(seed);
    const bpm = 92 + Math.floor(rng() * 44);
    const step = 60 / bpm / 4;
    const root = 45 + Math.floor(rng() * 10);
    const scale = rng() < 0.5 ? [0, 3, 5, 7, 10, 12, 15] : [0, 2, 4, 7, 9, 12, 14];
    const prog = [[0, 3, 4, 5], [0, 5, 3, 4], [0, 4, 5, 3]][Math.floor(rng() * 3)];
    const chordSemis = [0, 5, 7, 9, 2, 4];
    const melody = Array.from({ length: 32 }, () => (rng() < 0.55 ? scale[Math.floor(rng() * scale.length)] : null));
    const leadType: OscillatorType = (['square', 'sawtooth', 'triangle'] as const)[Math.floor(rng() * 3)];
    let n = 0;
    let next = c.currentTime + 0.06;

    const note = (freq: number, t: number, dur: number, type: OscillatorType, vol: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      if (this.fx.vinyl && !this.fx.clarity) o.detune.value = (Math.random() - 0.5) * 160;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const kick = (t: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.3);
    };
    const hat = (t: number, vol: number, dur: number) => {
      const len = Math.floor(c.sampleRate * dur);
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = c.createBufferSource();
      s.buffer = b;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = dur > 0.1 ? 1800 : 7000;
      const g = c.createGain();
      g.gain.value = vol;
      s.connect(f).connect(g).connect(out);
      s.start(t);
    };

    this.synthTimer = window.setInterval(() => {
      while (next < c.currentTime + 0.15) {
        const s = n % 16;
        const bar = Math.floor(n / 16) % 4;
        const chordRoot = root + chordSemis[prog[bar]];
        if (s % 4 === 0) kick(next);
        if (s === 4 || s === 12) hat(next, 0.35, 0.16);
        if (s % 2 === 0) hat(next, 0.12, 0.04);
        if (s === 0 || s === 6 || s === 10) note(midiToHz(chordRoot - 12), next, step * 3, 'sawtooth', 0.16);
        if (s === 0) [0, 4, 7].forEach((iv) => note(midiToHz(chordRoot + 12 + iv), next, step * 14, 'triangle', 0.05));
        const m = melody[n % 32];
        if (m !== null) note(midiToHz(root + 24 + m), next, step * 1.8, leadType, 0.08);
        next += step;
        n++;
      }
    }, 25);
  }
}

export const music = new MusicEngine();
