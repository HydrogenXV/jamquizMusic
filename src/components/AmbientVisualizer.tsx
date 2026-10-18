import React, { useEffect, useRef, useState } from 'react';
import { bgm } from '../lib/bgm';
import { visualizerSettings, type VisualizerConfig } from '../lib/visualizerSettings';

interface Props {
  className?: string;
}

interface StarParticle {
  x: number;
  y: number;
  baseVy: number;
  swaySpeed: number;
  swayAmp: number;
  swayPhase: number;
  rotation: number;
  vRot: number;
  baseRadius: number;
  spikes: number; // 4 for diamond sparkle, 5 for classic star
  color: string;
  glowColor: string;
  twinklePhase: number;
  twinkleSpeed: number;
  freqBucket: number;
}

export const AmbientVisualizer: React.FC<Props> = ({ className = '' }) => {
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
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colorPalette = [
      { fill: '#ffffff', glow: 'rgba(255, 255, 255, 0.8)' },   // Diamond White Starlight
      { fill: '#1ed760', glow: 'rgba(30, 215, 96, 0.8)' },     // Spotify Emerald
      { fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.8)' },    // Celestial Cyan
      { fill: '#fde047', glow: 'rgba(253, 224, 71, 0.8)' },    // Golden Starlight
      { fill: '#c084fc', glow: 'rgba(192, 132, 252, 0.8)' },   // Lavender Stardust
      { fill: '#6ee7b7', glow: 'rgba(110, 231, 183, 0.8)' },   // Mint
    ];

    // Star density scaled by screen area & user thickness setting (ความหนา Effect)
    const baseCount = Math.floor((width * height) / 13000);
    const starCount = Math.max(35, Math.min(220, Math.floor(baseCount * (0.5 + config.thickness * 0.45))));

    const stars: StarParticle[] = [];
    for (let i = 0; i < starCount; i++) {
      const palette = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseVy: 0.5 + Math.random() * 1.3, // Falling speed like snow
        swaySpeed: 0.015 + Math.random() * 0.025,
        swayAmp: 0.4 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.03,
        baseRadius: 2.2 + Math.random() * 4.2,
        spikes: Math.random() > 0.35 ? 4 : 5, // Mix 4-point diamond sparkles & 5-point stars
        color: palette.fill,
        glowColor: palette.glow,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.05,
        freqBucket: Math.floor(Math.random() * 32),
      });
    }

    const freqData = new Uint8Array(64);
    let time = 0;

    // Helper: Draw sparkling star
    const drawStar = (
      cx: number,
      cy: number,
      spikes: number,
      outerR: number,
      innerR: number,
      rot: number
    ) => {
      const step = Math.PI / spikes;
      ctx.beginPath();
      for (let i = 0; i < 2 * spikes; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = i * step + rot;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

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

      time += isPlaying ? 0.025 + energy * 0.03 : 0.015;
      const thickness = config.thickness; // 0.6x to 2.5x

      // Subtle atmospheric starlight vignette at top
      if (config.glow) {
        ctx.save();
        const topGlow = ctx.createLinearGradient(0, 0, 0, height * 0.4);
        topGlow.addColorStop(0, `rgba(30, 215, 96, ${0.04 * thickness * (energy + 0.3)})`);
        topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topGlow;
        ctx.fillRect(0, 0, width, height * 0.4);
        ctx.restore();
      }

      // Render Falling Stars (Snow-like gentle fall with starry sparkle)
      stars.forEach((s) => {
        const fVal = freqData[s.freqBucket] / 255;
        const beatBoost = isPlaying ? (1 + energy * 1.5 + fVal * 2.0 * thickness) : 1;

        // Fall downwards like snow, with horizontal sway
        const fallSpeed = (s.baseVy + (isPlaying ? fVal * 0.8 : 0)) * (0.8 + energy * 0.5) * (0.8 + thickness * 0.2);
        s.y += fallSpeed;
        s.x += Math.sin(time * s.swaySpeed * 10 + s.swayPhase) * s.swayAmp;
        s.rotation += s.vRot * (1 + energy * 1.2);

        // Wrap around seamlessly
        if (s.y > height + 20) {
          s.y = -20;
          s.x = Math.random() * width;
        }
        if (s.x < -20) s.x = width + 20;
        if (s.x > width + 20) s.x = -20;

        // Twinkle brightness modulation
        const twinkle = Math.sin(time * s.twinkleSpeed * 10 + s.twinklePhase) * 0.3 + 0.7;
        const currentAlpha = Math.min(1, Math.max(0.2, (twinkle * 0.6 + energy * 0.4) * (0.7 + thickness * 0.3)));

        // Scale radius with beat and thickness
        const outerRadius = Math.max(
          1.8,
          s.baseRadius * (0.7 + thickness * 0.35) * (1 + (isPlaying ? fVal * 1.2 * thickness : 0.1 * Math.sin(time + s.swayPhase)))
        );
        const innerRadius = s.spikes === 4 ? outerRadius * 0.26 : outerRadius * 0.42;

        ctx.save();

        // Star Glow Halo (if star is large or during beat drop)
        if (config.glow && outerRadius > 3.2) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, outerRadius * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = s.glowColor;
          ctx.globalAlpha = Math.min(0.4, 0.12 * thickness + (isPlaying ? fVal * 0.25 : 0));
          ctx.fill();
        }

        // Draw Star Shape
        ctx.fillStyle = s.color;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = Math.min(22, 5 * thickness * (1 + fVal * 2));
        drawStar(s.x, s.y, s.spikes, outerRadius, innerRadius, s.rotation);
        ctx.fill();

        ctx.restore();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [config.enabled, config.thickness, config.glow]);

  if (!config.enabled) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover filter drop-shadow-[0_0_12px_rgba(30,215,96,0.25)] transition-opacity duration-300"
      />
    </div>
  );
};
