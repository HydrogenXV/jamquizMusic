import React, { useEffect, useRef } from 'react';
import { music } from '../lib/audio';
import { mic } from '../lib/mic';

interface Props {
  className?: string;
  isMicMode?: boolean;
  isActive?: boolean;
  color?: string;
}

export const Visualizer: React.FC<Props> = ({
  className = 'w-full h-44',
  isMicMode = false,
  isActive = true,
  color = '#1ed760',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const dataArray = new Uint8Array(128);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += 0.04;

      const analyser = isMicMode && mic.active ? mic.analyser : music.analyser;

      let energy = 0;
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < 32; i++) {
          energy += dataArray[i];
        }
        energy = energy / 32 / 255; // normalized 0..1
      } else {
        // Idle gentle breathing pulse
        energy = 0.15 + 0.1 * Math.sin(phase * 1.5);
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.22;
      const dynamicRadius = baseRadius + energy * 25;

      // 1. Concentric Pulsing Rings (Glow effect)
      ctx.save();
      const ringCount = 3;
      for (let i = 1; i <= ringCount; i++) {
        ctx.beginPath();
        const r = dynamicRadius + i * 16 + Math.sin(phase + i) * 4;
        ctx.arc(centerX, centerY, Math.max(5, r), 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = Math.max(0, 0.25 - i * 0.07 + energy * 0.2);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Frequency Spectrum Radial Bars
      const numBars = 48;
      const angleStep = (Math.PI * 2) / numBars;

      ctx.save();
      ctx.translate(centerX, centerY);

      for (let i = 0; i < numBars; i++) {
        const angle = i * angleStep + phase * 0.1;
        const dataIdx = Math.floor((i / numBars) * 64);
        const val = analyser && isActive ? dataArray[dataIdx] / 255 : 0.15 + 0.1 * Math.sin(i * 0.4 + phase);
        const barHeight = 8 + val * (height * 0.32);

        const x1 = Math.cos(angle) * (dynamicRadius + 4);
        const y1 = Math.sin(angle) * (dynamicRadius + 4);
        const x2 = Math.cos(angle) * (dynamicRadius + 4 + barHeight);
        const y2 = Math.sin(angle) * (dynamicRadius + 4 + barHeight);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, color);
        grad.addColorStop(1, '#a855f7');

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(2, (width / numBars) * 0.6);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      // 3. Central glowing orb
      ctx.save();
      const orbGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, dynamicRadius);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, color);
      orbGrad.addColorStop(1, 'rgba(15, 15, 17, 0.85)');
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();
      ctx.restore();

      // Center music icon indicator
      ctx.save();
      ctx.fillStyle = '#0f0f11';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isMicMode ? '🎤' : '🎧', centerX, centerY);
      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isMicMode, isActive, color]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={220}
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_25px_rgba(30,215,96,0.35)]"
      />
    </div>
  );
};
