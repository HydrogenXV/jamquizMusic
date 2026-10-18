import React, { useEffect, useRef, useState } from 'react';
import { bgm } from '../lib/bgm';
import { visualizerSettings, type VisualizerConfig } from '../lib/visualizerSettings';

interface Props {
  className?: string;
  variant?: 'banner' | 'wave' | 'aura';
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  freqBucket: number;
  phase: number;
}

export const AmbientVisualizer: React.FC<Props> = ({
  className = 'w-full h-24 md:h-28',
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
    const width = 800;
    const height = 140;

    // Generate dynamic audio-reactive particle swarm
    const particleCount = Math.floor(40 + 35 * config.thickness);
    const colorPalette = [
      { fill: '#1ed760', glow: 'rgba(30, 215, 96, 0.65)' },    // Spotify Green
      { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.65)' },  // Emerald
      { fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.65)' },   // Cyan
      { fill: '#818cf8', glow: 'rgba(129, 140, 248, 0.60)' },  // Indigo
      { fill: '#a855f7', glow: 'rgba(168, 85, 247, 0.60)' },   // Purple
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const palette = colorPalette[i % colorPalette.length];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.6,
        baseRadius: 1.8 + Math.random() * 2.8,
        color: palette.fill,
        glowColor: palette.glow,
        freqBucket: Math.floor(Math.random() * 32),
        phase: Math.random() * Math.PI * 2,
      });
    }

    const freqData = new Uint8Array(64);
    let time = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      const bgmState = bgm.getState();
      const isPlaying = bgmState.isPlaying;
      const vol = bgmState.isMuted ? 0 : bgmState.volume;

      bgm.getFrequencyData(freqData);

      let energy = 0;
      for (let i = 0; i < 32; i++) {
        energy += freqData[i];
      }
      energy = (energy / 32 / 255) * (isPlaying ? Math.max(0.3, vol) : 0.08);

      time += isPlaying ? 0.02 + energy * 0.04 : 0.01;
      const thickness = config.thickness; // 0.6 to 2.5

      // 1. Central Cosmic Audio Nebula Glow
      if (config.glow) {
        ctx.save();
        const auraRadius = Math.min(width, height) * (0.6 + energy * thickness * 0.4);
        const aura = ctx.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, auraRadius);
        aura.addColorStop(0, `rgba(30, 215, 96, ${0.15 * thickness * (energy + 0.2)})`);
        aura.addColorStop(0.5, `rgba(56, 189, 248, ${0.08 * thickness * (energy + 0.1)})`);
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 2. Update & Draw Constellation Links between nearby particles
      const maxConnectDist = (65 + 25 * thickness);
      ctx.save();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * (0.25 + energy * 0.6) * (thickness * 0.7);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(30, 215, 96, ${Math.min(0.65, alpha)})`;
            ctx.lineWidth = Math.max(0.7, 1.2 * thickness * (1 - dist / maxConnectDist));
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 3. Render Particles with Reactive Halo & Frequency Pulse
      particles.forEach((p) => {
        // Frequency amplitude for this specific particle's bucket
        const fVal = freqData[p.freqBucket] / 255;
        const reactiveMultiplier = isPlaying ? (1 + fVal * 2.2 * thickness + energy * 1.5) : (1 + 0.2 * Math.sin(time + p.phase));

        // Movement with audio-driven turbulence
        const speedBoost = isPlaying ? (1 + energy * 1.8) : 0.8;
        p.x += p.vx * speedBoost;
        p.y += (p.vy - (isPlaying ? fVal * 0.4 : 0)) * speedBoost;

        // Wrap around boundaries smoothly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const currentRadius = Math.max(1.2, p.baseRadius * thickness * 0.7 * reactiveMultiplier);

        ctx.save();

        // Outer Particle Glow Halo
        if (config.glow && currentRadius > 2.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.glowColor;
          ctx.globalAlpha = Math.min(0.45, 0.15 * thickness + energy * 0.3);
          ctx.fill();
        }

        // Core Particle Orb
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, 0.55 + energy * 0.45);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = Math.min(20, 8 * thickness * (1 + fVal));
        ctx.fill();

        ctx.restore();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [config.enabled, config.thickness, config.glow, color]);

  if (!config.enabled) return null;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={140}
        className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(30,215,96,0.35)] transition-opacity duration-300"
      />
    </div>
  );
};
