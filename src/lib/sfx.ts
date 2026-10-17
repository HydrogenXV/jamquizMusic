import type { CardId } from '../../shared/types';
import { getCtx } from './audio';

// Procedural sound effects — every SFX is synthesised live with the Web Audio API.

let sfxOut: GainNode | null = null;
let muted = localStorage.getItem('sq.sfxMuted') === '1';
function out(): GainNode {
  const c = getCtx();
  if (!sfxOut) {
    sfxOut = c.createGain();
    sfxOut.gain.value = muted ? 0 : 0.55;
    sfxOut.connect(c.destination);
  }
  return sfxOut;
}
export function setSfxMuted(m: boolean) {
  muted = m;
  localStorage.setItem('sq.sfxMuted', m ? '1' : '0');
  if (sfxOut) sfxOut.gain.value = m ? 0 : 0.55;
}
export const isSfxMuted = () => muted;

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
  const c = getCtx();
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(at: number, dur: number, vol = 0.3, type: BiquadFilterType = 'bandpass', f1 = 1000, f2?: number, q = 1) {
  const c = getCtx();
  const t = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = b;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f1, t);
  if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out());
  s.start(t);
}

export const sfx = {
  click: () => tone(880, 0, 0.06, 'triangle', 0.12),
  hover: () => tone(1320, 0, 0.03, 'sine', 0.04),
  tick: (urgent = false) => tone(urgent ? 1500 : 1100, 0, 0.05, 'square', urgent ? 0.12 : 0.06),
  countdown: (final = false) => tone(final ? 1046 : 523, 0, final ? 0.4 : 0.15, 'triangle', 0.25),
  correct: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.35, 'triangle', 0.22)),
  wrong: () => {
    tone(220, 0, 0.35, 'sawtooth', 0.18, 110);
    tone(233, 0.02, 0.35, 'square', 0.08, 116);
  },
  streak: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.06, 0.25, 'square', 0.1));
    [2093, 2637, 3136].forEach((f, i) => tone(f, 0.35 + i * 0.05, 0.4, 'sine', 0.06));
  },
  cast: () => {
    tone(300, 0, 0.45, 'sine', 0.2, 1800);
    for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 2400, 0.12 + i * 0.05, 0.18, 'sine', 0.05);
  },
  sabotage: () => {
    const c = getCtx();
    const t = c.currentTime;
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const lg = c.createGain();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = 750;
    lfo.frequency.value = 6;
    lg.gain.value = 180;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.03);
    g.gain.setValueAtTime(0.1, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(g).connect(out());
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.05);
    lfo.stop(t + 1.05);
  },
  victory: () => {
    const seq: [number, number, number][] = [[392, 0, 0.18], [523, 0.18, 0.18], [659, 0.36, 0.18], [784, 0.54, 0.5], [659, 1.08, 0.16], [784, 1.24, 0.8]];
    seq.forEach(([f, at, d]) => {
      tone(f, at, d, 'sawtooth', 0.12);
      tone(f * 2, at, d, 'triangle', 0.06);
    });
    noise(0.54, 1.2, 0.05, 'highpass', 6000);
  },
  flip: () => noise(0, 0.18, 0.18, 'bandpass', 800, 3500, 2),
  whoosh: () => noise(0, 0.4, 0.2, 'bandpass', 300, 4000, 1.5),
  card: (id: CardId) => CARD_SFX[id](),
};

const CARD_SFX: Record<CardId, () => void> = {
  purge: () => { tone(1600, 0, 0.12, 'square', 0.12, 200); tone(1600, 0.13, 0.12, 'square', 0.12, 200); },
  heist: () => [0, 0.12, 0.24, 0.36, 0.48].forEach((a, i) => tone(i % 2 ? 1200 : 900, a, 0.05, 'square', 0.12)),
  double: () => { [988, 1319].forEach((f, i) => tone(f, i * 0.08, 0.6, 'triangle', 0.18)); noise(0.1, 0.5, 0.05, 'highpass', 8000); },
  warp: () => { tone(1200, 0, 0.9, 'sine', 0.2, 120); tone(1210, 0, 0.9, 'triangle', 0.08, 125); },
  clarity: () => [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, i * 0.06, 0.6, 'sine', 0.08)),
  radar: () => { tone(1400, 0, 0.5, 'sine', 0.2); tone(1400, 0.45, 0.35, 'sine', 0.07); },
  jumble: () => { for (let i = 0; i < 8; i++) tone(400 + Math.random() * 1200, i * 0.045, 0.05, 'square', 0.08); },
  ink: () => { noise(0, 0.35, 0.5, 'lowpass', 900, 120); tone(140, 0, 0.25, 'sine', 0.35, 50); },
  vinyl: () => { noise(0, 0.18, 0.35, 'bandpass', 600, 3000, 4); noise(0.2, 0.2, 0.35, 'bandpass', 3000, 500, 4); },
  captcha: () => { tone(110, 0, 0.35, 'sawtooth', 0.22, 85); tone(130, 0.35, 0.3, 'sawtooth', 0.18, 95); },
  leech: () => { tone(500, 0, 0.6, 'sine', 0.22, 90); tone(520, 0.05, 0.55, 'triangle', 0.1, 100); },
  glitch: () => { for (let i = 0; i < 7; i++) noise(i * 0.06, 0.04, 0.3, 'bandpass', 500 + Math.random() * 5000, undefined, 8); },
  shield: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.05, 0.4, 'sine', 0.15)); noise(0, 0.3, 0.04, 'highpass', 4000); },
  frenzy: () => { [400, 600, 900, 1400].forEach((f, i) => tone(f, i * 0.04, 0.25, 'sawtooth', 0.12)); },
  freeze: () => { tone(2400, 0, 0.4, 'triangle', 0.18, 1200); noise(0.05, 0.35, 0.2, 'highpass', 5500); },
  smoke: () => { noise(0, 0.6, 0.35, 'lowpass', 600, 200); noise(0.1, 0.4, 0.15, 'bandpass', 1200, 400); },
};
