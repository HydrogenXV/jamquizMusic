// Visualizer Settings Manager
// Controls visualizer effect toggle (ON/OFF), thickness/intensity (ความหนาตามจังหวะเพลง)
// and persists preferences to localStorage.

export type VisualizerThickness = 'thin' | 'medium' | 'thick' | 'mega';

export interface VisualizerConfig {
  enabled: boolean;
  thickness: number; // 0.5 to 2.5
  preset: VisualizerThickness;
  glow: boolean;
}

const STORAGE_KEY_ENABLED = 'jq.visualizer.enabled';
const STORAGE_KEY_THICKNESS = 'jq.visualizer.thickness';

const THICKNESS_PRESETS: Record<VisualizerThickness, number> = {
  thin: 0.6,
  medium: 1.2,
  thick: 1.8,
  mega: 2.5,
};

class VisualizerSettingsManager {
  private enabled: boolean;
  private thickness: number;
  private preset: VisualizerThickness;
  private listeners = new Set<(cfg: VisualizerConfig) => void>();

  constructor() {
    const savedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);
    this.enabled = savedEnabled !== null ? savedEnabled === 'true' : true;

    const savedThickness = localStorage.getItem(STORAGE_KEY_THICKNESS);
    if (savedThickness && !isNaN(Number(savedThickness))) {
      this.thickness = Math.max(0.4, Math.min(3.0, Number(savedThickness)));
    } else {
      this.thickness = 1.2;
    }

    this.preset = this.determinePreset(this.thickness);
  }

  private determinePreset(val: number): VisualizerThickness {
    if (val <= 0.8) return 'thin';
    if (val <= 1.4) return 'medium';
    if (val <= 2.0) return 'thick';
    return 'mega';
  }

  getConfig(): VisualizerConfig {
    return {
      enabled: this.enabled,
      thickness: this.thickness,
      preset: this.preset,
      glow: true,
    };
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem(STORAGE_KEY_ENABLED, String(val));
    this.notify();
  }

  setThickness(val: number) {
    const clamped = Math.max(0.4, Math.min(3.0, val));
    this.thickness = clamped;
    this.preset = this.determinePreset(clamped);
    localStorage.setItem(STORAGE_KEY_THICKNESS, String(clamped));
    this.notify();
  }

  setPreset(preset: VisualizerThickness) {
    const val = THICKNESS_PRESETS[preset] ?? 1.2;
    this.thickness = val;
    this.preset = preset;
    localStorage.setItem(STORAGE_KEY_THICKNESS, String(val));
    this.notify();
  }

  subscribe(listener: (cfg: VisualizerConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.getConfig());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const cfg = this.getConfig();
    this.listeners.forEach((l) => l(cfg));
  }
}

export const visualizerSettings = new VisualizerSettingsManager();
