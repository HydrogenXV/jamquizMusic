import React, { useEffect, useRef, useState } from 'react';
import { bgm } from '../lib/bgm';
import { visualizerSettings, type VisualizerConfig } from '../lib/visualizerSettings';

interface Props {
  className?: string;
  variant?: 'banner' | 'wave' | 'aura';
  color?: string;
}

export const AmbientVisualizer: React.FC<Props> = ({
  className = 'w-full h-24 md:h-28',
  variant = 'banner',
  color = '#1ed760',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<VisualizerConfig>(visualizerSettings.getConfig());

  useEffect(() => {
    const unsub = visualizerSettings.subscribe((c) => setConfig({ ...c }));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!config.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    const freqData = new Uint8Array(64);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Check if BGM is active and playing
      const bgmState = bgm.getState();
      const isPlaying = bgmState.isPlaying;
      const vol = bgmState.isMuted ? 0 : bgmState.volume;

      // Extract frequency or compute rhythmic procedural pulse
      bgm.getFrequencyData(freqData);

      let energy = 0;
      for (let i = 0; i < 32; i++) {
        energy += freqData[i];
      }
      energy = (energy / 32 / 255) * (isPlaying ? Math.max(0.3, vol) : 0.08);

      phase += isPlaying ? 0.04 + energy * 0.05 : 0.015;

      const thickness = config.thickness; // 0.5 to 2.5
      const baseLineWidth = Math.max(1.5, 3 * thickness);

      if (variant === 'banner' || variant === 'wave') {
        // Multi-layered horizontal flowing sound wave with glowing aura
        const centerY = height / 2;
        const waveLayers = [
          { freq: 1.2, speed: 1.0, alpha: 0.35, color: '#10b981', amp: 0.7 },
          { freq: 1.8, speed: 1.4, alpha: 0.55, color: '#1ed760', amp: 1.0 },
          { freq: 2.6, speed: 1.9, alpha: 0.40, color: '#38bdf8', amp: 0.8 },
          { freq: 3.5, speed: 2.3, alpha: 0.25, color: '#a855f7', amp: 0.6 },
        ];

        // Central Aura Glow
        if (config.glow && isPlaying) {
          ctx.save();
          const auraRadius = Math.min(width, height) * (0.8 + energy * thickness * 0.5);
          const aura = ctx.createRadialGradient(width / 2, centerY, 5, width / 2, centerY, auraRadius);
          aura.addColorStop(0, `rgba(30, 215, 96, ${0.18 * thickness * energy})`);
          aura.addColorStop(0.6, `rgba(56, 189, 248, ${0.08 * thickness})`);
          aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = aura;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        // Draw flowing audio waves
        waveLayers.forEach((layer, lIdx) => {
          ctx.save();
          ctx.beginPath();

          const step = 8;
          const pointsCount = Math.ceil(width / step) + 1;

          for (let i = 0; i < pointsCount; i++) {
            const x = i * step;
            const normX = i / pointsCount;
            // Frequency modulation based on frequency bucket
            const dataIdx = Math.floor(normX * 32) % 32;
            const fVal = freqData[dataIdx] / 255;

            // Envelope curve: smooth taper at the edges
            const envelope = Math.sin(normX * Math.PI);

            const wave =
              Math.sin(normX * Math.PI * 4 * layer.freq + phase * layer.speed) *
              Math.cos(normX * Math.PI * 2 + phase * 0.5);

            const amp = (12 + fVal * 35 * thickness + energy * 20) * layer.amp * envelope;
            const y = centerY + wave * amp;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.strokeStyle = layer.color;
          ctx.lineWidth = baseLineWidth * (1 - lIdx * 0.15);
          ctx.globalAlpha = Math.min(1, layer.alpha * (0.6 + energy * 0.8 * thickness));
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        });

        // Spectrum frequency equalizer bars on bottom edge
        const barCount = 42;
        const barWidth = (width / barCount) * 0.55;
        const gap = (width / barCount) * 0.45;

        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap) + gap / 2;
          const dataIdx = Math.floor((i / barCount) * 32);
          const fVal = isPlaying ? freqData[dataIdx] / 255 : 0.08 + 0.04 * Math.sin(i * 0.5 + phase);
          const barHeight = Math.max(3, fVal * (height * 0.42) * thickness);

          const grad = ctx.createLinearGradient(x, height, x, height - barHeight);
          grad.addColorStop(0, 'rgba(30, 215, 96, 0.2)');
          grad.addColorStop(1, 'rgba(30, 215, 96, 0.85)');

          ctx.save();
          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth * Math.min(2, thickness), barHeight);
          ctx.restore();
        }
      } else {
        // Radial Aura Visualizer (Orb)
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.32 + energy * 18 * thickness;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = baseLineWidth;
        ctx.globalAlpha = Math.min(1, 0.4 + energy * thickness);
        ctx.stroke();
        ctx.restore();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [config.enabled, config.thickness, config.glow, variant, color]);

  if (!config.enabled) return null;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={140}
        className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(30,215,96,0.3)] transition-opacity duration-300"
      />
    </div>
  );
};
