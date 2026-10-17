import { getCtx } from './audio';

const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export interface MicReading {
  level: number; // 0..1 RMS-ish
  pitch: number | null; // Hz
  note: string | null;
}

/** Live microphone capture with autocorrelation pitch detection for Mic Mayhem mode. */
class MicEngine {
  analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private buf = new Float32Array(2048);

  get active() {
    return !!this.stream;
  }

  async start(): Promise<boolean> {
    if (this.stream) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const c = getCtx();
      const src = c.createMediaStreamSource(this.stream);
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.6;
      src.connect(this.analyser);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }

  read(): MicReading {
    if (!this.analyser) return { level: 0, pitch: null, note: null };
    this.analyser.getFloatTimeDomainData(this.buf);
    let rms = 0;
    for (let i = 0; i < this.buf.length; i++) rms += this.buf[i] * this.buf[i];
    rms = Math.sqrt(rms / this.buf.length);
    const level = Math.min(1, rms * 8);
    const pitch = rms > 0.015 ? autoCorrelate(this.buf.subarray(0, 1024), getCtx().sampleRate) : null;
    let note: string | null = null;
    if (pitch) {
      const midi = Math.round(12 * Math.log2(pitch / 440) + 69);
      note = `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
    }
    return { level, pitch, note };
  }
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  // Trim silence at the edges, then find the strongest periodicity (ACF2+).
  let r1 = 0;
  let r2 = buf.length - 1;
  const thres = 0.2;
  for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[buf.length - i]) < thres) { r2 = buf.length - i; break; }
  const b = buf.slice(r1, r2);
  const n = b.length;
  if (n < 64) return null;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  if (maxpos <= 0) return null;
  let T0 = maxpos;
  const x1 = c[T0 - 1] ?? 0, x2 = c[T0], x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  const hz = sampleRate / T0;
  return hz > 70 && hz < 1100 ? hz : null;
}

export const mic = new MicEngine();
