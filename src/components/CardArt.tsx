import React from 'react';
import type { CardId } from '../../shared/types';
import { CARDS } from '../../shared/game';

interface Props {
  id: CardId;
  className?: string;
}

export const CardArt: React.FC<Props> = ({ id, className = 'w-full h-full' }) => {
  const card = CARDS[id];
  const c1 = card?.hue ?? '#1ed760';
  const c2 = card?.hue2 ?? '#0ea5e9';

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`rad-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.8" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.1" />
        </radialGradient>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Card Background Pattern */}
      <rect width="200" height="240" rx="16" fill="#141419" />
      <circle cx="100" cy="120" r="85" fill={`url(#rad-${id})`} opacity="0.3" />
      
      {/* Decorative framing grid lines */}
      <rect x="10" y="10" width="180" height="220" rx="12" stroke={c1} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
      <path d="M 20 20 L 40 20 M 20 20 L 20 40 M 180 20 L 160 20 M 180 20 L 180 40 M 20 220 L 40 220 M 20 220 L 20 200 M 180 220 L 160 220 M 180 220 L 180 200" stroke={c2} strokeWidth="2" strokeLinecap="round" />

      {/* Custom Artwork Based on Card ID */}
      {id === 'purge' && (
        <g filter={`url(#glow-${id})`}>
          {/* Laser Scythe / Cleanser cutting wrong answers */}
          <path d="M 40 180 L 160 60" stroke={`url(#grad-${id})`} strokeWidth="10" strokeLinecap="round" />
          <path d="M 70 80 L 130 160" stroke="#ff4757" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
          <path d="M 130 80 L 70 160" stroke="#ff4757" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
          <circle cx="100" cy="120" r="28" fill="#141419" stroke={c1} strokeWidth="4" />
          <text x="100" y="128" fill="#1ed760" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">50%</text>
        </g>
      )}

      {id === 'heist' && (
        <g filter={`url(#glow-${id})`}>
          {/* Clock heist pocketwatch with lightning gears */}
          <circle cx="100" cy="120" r="48" stroke={`url(#grad-${id})`} strokeWidth="6" fill="#121216" />
          <circle cx="100" cy="120" r="40" stroke="#ffffff22" strokeWidth="2" strokeDasharray="4 6" />
          <line x1="100" y1="120" x2="100" y2="88" stroke="#facc15" strokeWidth="5" strokeLinecap="round" />
          <line x1="100" y1="120" x2="126" y2="120" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="120" r="6" fill="#fff" />
          {/* Clock top hook */}
          <path d="M 92 72 C 92 64 108 64 108 72" stroke={c1} strokeWidth="4" fill="none" />
          <path d="M 145 75 L 165 65 L 155 85 Z" fill="#facc15" />
          <text x="100" y="185" fill="#facc15" fontSize="16" fontWeight="900" textAnchor="middle">+5 SEC</text>
        </g>
      )}

      {id === 'double' && (
        <g filter={`url(#glow-${id})`}>
          {/* Legendary Golden Multiplier Dice / Shield */}
          <rect x="62" y="82" width="76" height="76" rx="18" fill="url(#grad-double)" stroke="#fff" strokeWidth="3" transform="rotate(12 100 120)" />
          <circle cx="86" cy="106" r="6" fill="#141419" />
          <circle cx="114" cy="134" r="6" fill="#141419" />
          <text x="100" y="132" fill="#fff" fontSize="36" fontWeight="900" textAnchor="middle" fontFamily="sans-serif" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.8))">
            2×
          </text>
          {/* Crown */}
          <path d="M 80 62 L 90 70 L 100 58 L 110 70 L 120 62 L 118 78 L 82 78 Z" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" />
        </g>
      )}

      {id === 'warp' && (
        <g filter={`url(#glow-${id})`}>
          {/* Cosmic wormhole vortex */}
          <ellipse cx="100" cy="120" rx="60" ry="25" stroke={c1} strokeWidth="3" transform="rotate(-25 100 120)" />
          <ellipse cx="100" cy="120" rx="45" ry="18" stroke={c2} strokeWidth="3.5" transform="rotate(20 100 120)" />
          <ellipse cx="100" cy="120" rx="28" ry="10" stroke="#fff" strokeWidth="4" transform="rotate(-60 100 120)" />
          <circle cx="100" cy="120" r="12" fill="#22d3ee" />
          <path d="M 60 70 Q 100 30 140 70" stroke={c1} strokeWidth="2" strokeDasharray="3 3" fill="none" />
          <text x="100" y="195" fill="#a5b4fc" fontSize="13" fontWeight="700" textAnchor="middle">-40% SPEED</text>
        </g>
      )}

      {id === 'clarity' && (
        <g filter={`url(#glow-${id})`}>
          {/* Crystal Prism + Pure Waveform */}
          <path d="M 100 65 L 145 155 L 55 155 Z" stroke={`url(#grad-${id})`} strokeWidth="5" fill="#082f49" />
          <path d="M 100 65 L 100 155" stroke="#fff" strokeWidth="2" opacity="0.6" />
          <circle cx="100" cy="120" r="16" fill="#67e8f9" opacity="0.4" />
          {/* Audio Wave beams */}
          <path d="M 25 120 Q 50 90 75 120 T 125 120 T 175 120" stroke="#22d3ee" strokeWidth="3" fill="none" />
          <circle cx="100" cy="120" r="6" fill="#fff" />
        </g>
      )}

      {id === 'radar' && (
        <g filter={`url(#glow-${id})`}>
          {/* Radar Sweep & Decade Scanner */}
          <circle cx="100" cy="120" r="50" stroke={c1} strokeWidth="3" fill="#064e3b" opacity="0.5" />
          <circle cx="100" cy="120" r="32" stroke={c2} strokeWidth="2" strokeDasharray="5 5" fill="none" />
          <circle cx="100" cy="120" r="14" stroke="#fff" strokeWidth="2" fill="none" />
          <line x1="100" y1="120" x2="140" y2="85" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" />
          <circle cx="136" cy="89" r="5" fill="#fff" />
          <text x="100" y="195" fill="#34d399" fontSize="14" fontWeight="800" textAnchor="middle">ERA SCAN</text>
        </g>
      )}

      {id === 'jumble' && (
        <g filter={`url(#glow-${id})`}>
          {/* Tangled crossover shuffle arrows */}
          <rect x="45" y="80" width="40" height="26" rx="8" fill="#fb923c" />
          <rect x="115" y="80" width="40" height="26" rx="8" fill="#f43f5e" />
          <rect x="45" y="134" width="40" height="26" rx="8" fill="#f43f5e" />
          <rect x="115" y="134" width="40" height="26" rx="8" fill="#fb923c" />
          {/* Crossed arrows */}
          <path d="M 85 93 Q 100 105 115 147" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 85 147 Q 100 135 115 93" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
          <text x="65" y="98" fill="#fff" fontSize="13" fontWeight="900" textAnchor="middle">A</text>
          <text x="135" y="98" fill="#fff" fontSize="13" fontWeight="900" textAnchor="middle">B</text>
          <text x="65" y="152" fill="#fff" fontSize="13" fontWeight="900" textAnchor="middle">C</text>
          <text x="135" y="152" fill="#fff" fontSize="13" fontWeight="900" textAnchor="middle">D</text>
        </g>
      )}

      {id === 'ink' && (
        <g filter={`url(#glow-${id})`}>
          {/* Giant splattered ink blotches */}
          <path
            d="M 100 80 C 120 70 145 85 140 110 C 160 120 155 150 135 155 C 130 175 105 170 95 160 C 75 175 60 150 65 130 C 50 115 65 85 90 90 Z"
            fill="url(#grad-ink)"
          />
          <circle cx="135" cy="75" r="9" fill={c1} />
          <circle cx="55" cy="155" r="7" fill={c1} />
          <circle cx="150" cy="165" r="6" fill={c1} />
          <circle cx="65" cy="75" r="5" fill={c2} />
          <ellipse cx="100" cy="125" rx="14" ry="18" fill="#0f0f13" />
        </g>
      )}

      {id === 'vinyl' && (
        <g filter={`url(#glow-${id})`}>
          {/* Scratched Vinyl record */}
          <circle cx="100" cy="120" r="54" fill="#09090c" stroke={c1} strokeWidth="3" />
          <circle cx="100" cy="120" r="44" stroke="#ffffff22" strokeWidth="1.5" />
          <circle cx="100" cy="120" r="34" stroke="#ffffff15" strokeWidth="1.5" />
          <circle cx="100" cy="120" r="22" stroke="#ffffff22" strokeWidth="1.5" />
          <circle cx="100" cy="120" r="15" fill="#f472b6" />
          <circle cx="100" cy="120" r="4" fill="#09090c" />
          {/* Scratch lightning mark */}
          <path d="M 60 90 L 95 125 L 85 135 L 140 160" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {id === 'captcha' && (
        <g filter={`url(#glow-${id})`}>
          {/* Moo Deng Hippo Head silhouette badge */}
          <rect x="52" y="74" width="96" height="92" rx="18" fill="#4c0519" stroke={c1} strokeWidth="3" />
          {/* Hippo ears */}
          <circle cx="70" cy="90" r="10" fill="#fda4af" />
          <circle cx="130" cy="90" r="10" fill="#fda4af" />
          {/* Hippo face */}
          <ellipse cx="100" cy="120" rx="32" ry="26" fill="#f43f5e" />
          <ellipse cx="100" cy="132" rx="24" ry="16" fill="#fda4af" />
          {/* Nostrils */}
          <circle cx="92" cy="130" r="3.5" fill="#881337" />
          <circle cx="108" cy="130" r="3.5" fill="#881337" />
          {/* Eyes */}
          <circle cx="85" cy="112" r="5" fill="#000" />
          <circle cx="86" cy="110" r="1.5" fill="#fff" />
          <circle cx="115" cy="112" r="5" fill="#000" />
          <circle cx="116" cy="110" r="1.5" fill="#fff" />
          <text x="100" y="195" fill="#fda4af" fontSize="12" fontWeight="900" textAnchor="middle">VERIFY 🦛</text>
        </g>
      )}

      {id === 'leech' && (
        <g filter={`url(#glow-${id})`}>
          {/* Parasite tentacles leeching points */}
          <path d="M 100 80 C 130 80 150 110 135 140 C 120 165 80 165 65 140 C 50 110 70 80 100 80 Z" fill="#84cc16" />
          <circle cx="100" cy="120" r="18" fill="#dc2626" />
          <circle cx="100" cy="120" r="8" fill="#141419" />
          {/* Leech fangs */}
          <path d="M 94 112 L 97 122 L 100 112" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M 94 128 L 97 118 L 100 128" stroke="#fff" strokeWidth="2" fill="none" />
          {/* Point drain arrows */}
          <path d="M 40 120 L 60 120 M 160 120 L 140 120" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
          <text x="100" y="195" fill="#ef4444" fontSize="14" fontWeight="900" textAnchor="middle">-300 STEAL</text>
        </g>
      )}

      {id === 'glitch' && (
        <g filter={`url(#glow-${id})`}>
          {/* Retro VHS static noise distortion blocks */}
          <rect x="50" y="75" width="100" height="90" rx="10" fill="#181824" stroke={c1} strokeWidth="3" />
          <rect x="42" y="90" width="116" height="12" fill="#ec4899" opacity="0.8" />
          <rect x="46" y="125" width="108" height="10" fill="#22d3ee" opacity="0.8" />
          <rect x="58" y="145" width="84" height="6" fill="#fff" opacity="0.9" />
          <text x="100" y="118" fill="#fff" fontSize="18" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            NO SIGNAL
          </text>
        </g>
      )}

      {id === 'shield' && (
        <g filter={`url(#glow-${id})`}>
          {/* Sonic Aegis Shield */}
          <path
            d="M 100 60 L 145 80 L 145 130 C 145 160 100 180 100 180 C 100 180 55 160 55 130 L 55 80 Z"
            fill="url(#grad-shield)"
            stroke="#fff"
            strokeWidth="3.5"
          />
          <path
            d="M 100 75 L 132 90 L 132 128 C 132 148 100 165 100 165 C 100 165 68 148 68 128 L 68 90 Z"
            fill="#032541"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <circle cx="100" cy="118" r="14" fill="#38bdf8" opacity="0.8" />
          <path d="M 94 118 L 98 123 L 108 112" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="100" y="200" fill="#38bdf8" fontSize="12" fontWeight="900" textAnchor="middle">IMMUNITY</text>
        </g>
      )}

      {id === 'frenzy' && (
        <g filter={`url(#glow-${id})`}>
          {/* Score Frenzy flaming burst */}
          <circle cx="100" cy="120" r="48" fill="#4c0519" stroke={c1} strokeWidth="3.5" />
          <path
            d="M 100 68 C 112 90 130 95 125 118 C 120 140 105 145 100 165 C 95 145 80 140 75 118 C 70 95 88 90 100 68 Z"
            fill="url(#grad-frenzy)"
          />
          <path
            d="M 100 95 C 108 108 116 112 112 124 C 108 136 102 138 100 150 C 98 138 92 136 88 124 C 84 112 92 108 100 95 Z"
            fill="#fef08a"
          />
          <text x="100" y="132" fill="#fff" fontSize="24" fontWeight="900" textAnchor="middle" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.8))">
            MAX
          </text>
          <text x="100" y="195" fill="#f43f5e" fontSize="12" fontWeight="900" textAnchor="middle">STREAK COMBO</text>
        </g>
      )}

      {id === 'freeze' && (
        <g filter={`url(#glow-${id})`}>
          {/* Cryo Freeze Ice Crystal */}
          <rect x="55" y="75" width="90" height="90" rx="14" fill="#082f49" stroke="#67e8f9" strokeWidth="3" transform="rotate(45 100 120)" />
          <path d="M 100 65 L 100 175 M 45 120 L 155 120" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M 65 85 L 135 155 M 135 85 L 65 155" stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round" />
          {/* Crystal spikes */}
          <circle cx="100" cy="120" r="10" fill="#e0f2fe" />
          <path d="M 100 80 L 95 90 M 100 80 L 105 90" stroke="#fff" strokeWidth="2" />
          <path d="M 100 160 L 95 150 M 100 160 L 105 150" stroke="#fff" strokeWidth="2" />
          <text x="100" y="200" fill="#67e8f9" fontSize="13" fontWeight="900" textAnchor="middle">2.5s FROZEN</text>
        </g>
      )}

      {id === 'smoke' && (
        <g filter={`url(#glow-${id})`}>
          {/* Smoke Screen Cloud */}
          <circle cx="85" cy="115" r="30" fill="#334155" opacity="0.9" />
          <circle cx="118" cy="110" r="26" fill="#475569" opacity="0.9" />
          <circle cx="100" cy="95" r="28" fill="#64748b" opacity="0.85" />
          <circle cx="75" cy="135" r="22" fill="#1e293b" opacity="0.95" />
          <circle cx="125" cy="132" r="24" fill="#1e293b" opacity="0.95" />
          <path d="M 70 145 Q 100 165 130 145" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" fill="none" />
          <text x="100" y="125" fill="#f1f5f9" fontSize="15" fontWeight="900" textAnchor="middle">
            SMOKE
          </text>
          <text x="100" y="195" fill="#94a3b8" fontSize="12" fontWeight="800" textAnchor="middle">OBSCURE</text>
        </g>
      )}
    </svg>
  );
};
