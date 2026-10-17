import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import type { ActiveEffect } from '../../shared/types';
import { AlertTriangle, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  effects: ActiveEffect[];
  onDismissEffect?: (uid: string) => void;
  onCaptchaSolved?: () => void;
}

interface InkSpot {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  hp: number; // 2 hits required to clear
}

export const SabotageOverlays: React.FC<Props> = ({ effects, onCaptchaSolved }) => {
  const { t } = useI18n();

  // Ink Splat state (8 dense spots with 2 wipes each)
  const inkEffect = effects.find((e) => e.card === 'ink');
  const [inkSpots, setInkSpots] = useState<InkSpot[]>([]);

  useEffect(() => {
    if (inkEffect) {
      sfx.card('ink');
      const spots: InkSpot[] = [
        { id: 1, x: 22, y: 30, size: 280, rotation: 12, hp: 2 },
        { id: 2, x: 78, y: 35, size: 310, rotation: -25, hp: 2 },
        { id: 3, x: 50, y: 55, size: 340, rotation: 40, hp: 2 },
        { id: 4, x: 26, y: 75, size: 270, rotation: -15, hp: 2 },
        { id: 5, x: 74, y: 72, size: 280, rotation: 65, hp: 2 },
        { id: 6, x: 50, y: 22, size: 240, rotation: -45, hp: 2 },
        { id: 7, x: 15, y: 55, size: 220, rotation: 80, hp: 2 },
        { id: 8, x: 85, y: 55, size: 230, rotation: -70, hp: 2 },
      ];
      setInkSpots(spots);
    } else {
      setInkSpots([]);
    }
  }, [inkEffect?.uid]);

  const handleWipeSpot = (id: number) => {
    sfx.click();
    setInkSpots((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, hp: s.hp - 1 } : s))
        .filter((s) => s.hp > 0)
    );
  };

  // Moo Deng Captcha state (6 tiles grid, 3 Moo Dengs, wrong click triggers buzz penalty)
  const captchaEffect = effects.find((e) => e.card === 'captcha');
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const [buzzError, setBuzzError] = useState(false);

  // 6 tiles: tiles 0, 2, 4 are Moo Deng; tiles 1, 3, 5 are decoys
  const tiles = [
    { id: 0, isMooDeng: true, img: '/moo-deng.jpg', label: 'Moo Deng' },
    { id: 1, isMooDeng: false, img: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=300&auto=format&fit=crop&q=60', label: 'Cat' },
    { id: 2, isMooDeng: true, img: '/moo-deng.jpg', label: 'Moo Deng Baby' },
    { id: 3, isMooDeng: false, img: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=300&auto=format&fit=crop&q=60', label: 'Dog' },
    { id: 4, isMooDeng: true, img: '/moo-deng.jpg', label: 'Moo Deng Splash' },
    { id: 5, isMooDeng: false, img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&auto=format&fit=crop&q=60', label: 'Pug' },
  ];

  useEffect(() => {
    if (captchaEffect && !captchaSolved) {
      sfx.card('captcha');
      setCaptchaOpen(true);
      setSelectedTiles([]);
      setBuzzError(false);
    } else if (!captchaEffect) {
      setCaptchaOpen(false);
      setCaptchaSolved(false);
    }
  }, [captchaEffect?.uid, captchaSolved]);

  const toggleTile = (id: number) => {
    sfx.click();
    setSelectedTiles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const verifyCaptcha = () => {
    // 0, 2, 4 must all be selected, and 1, 3, 5 must NOT be selected
    const has0 = selectedTiles.includes(0);
    const has2 = selectedTiles.includes(2);
    const has4 = selectedTiles.includes(4);
    const hasDecoy = selectedTiles.some((id) => [1, 3, 5].includes(id));

    if (has0 && has2 && has4 && !hasDecoy) {
      sfx.correct();
      setCaptchaSolved(true);
      setCaptchaOpen(false);
      onCaptchaSolved?.();
    } else {
      sfx.wrong();
      setBuzzError(true);
      setTimeout(() => setBuzzError(false), 600);
      setSelectedTiles([]);
    }
  };

  // Other active effects
  const hasGlitch = effects.some((e) => e.card === 'glitch');
  const hasVinyl = effects.some((e) => e.card === 'vinyl');
  const hasLeech = effects.some((e) => e.card === 'leech');
  const hasJumble = effects.some((e) => e.card === 'jumble');
  const hasFreeze = effects.some((e) => e.card === 'freeze');
  const hasSmoke = effects.some((e) => e.card === 'smoke');

  return (
    <>
      {/* 1. Cryo Freeze Frost Overlay with Intense Ice Cracking & Blizzard */}
      {hasFreeze && (
        <div className="fixed inset-0 pointer-events-none z-45 border-[12px] border-cyan-400/80 shadow-[inset_0_0_120px_rgba(34,211,238,0.7)] backdrop-blur-[3px] bg-cyan-950/30 flex items-center justify-center animate-pulse">
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 px-6 py-2.5 rounded-full shadow-[0_0_40px_rgba(34,211,238,0.6)] flex items-center gap-3 text-sm font-black tracking-widest uppercase">
            <span className="text-2xl animate-spin-slow">❄️</span>
            <span>CRYO FREEZE: ANSWERS FROZEN IN SOLID ICE!</span>
          </div>
          <div className="text-center opacity-30 select-none text-9xl">🧊</div>
        </div>
      )}

      {/* 2. Heavy Dense Smoke Screen Overlay */}
      {hasSmoke && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-neutral-950/80 backdrop-blur-md mix-blend-multiply flex flex-col items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-radial from-transparent via-neutral-900/90 to-black/95 pointer-events-none" />
          <div className="relative z-10 bg-neutral-900/95 border border-neutral-600 text-neutral-200 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl animate-pulse">
            <span className="text-xl">💨</span>
            <span>Heavy Smoke Screen: View Obscured!</span>
          </div>
        </div>
      )}

      {/* 3. VHS Static Glitch Overlay */}
      {hasGlitch && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden mix-blend-screen opacity-85">
          <div className="absolute inset-0 bg-red-600/15 animate-flicker" />
          <div className="absolute inset-0 scanlines" />
          <div className="absolute top-4 left-6 flex items-center gap-2 bg-red-600 text-white font-mono text-xs font-bold px-3 py-1 rounded shadow-lg uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            {t('glitchWarn')}
          </div>
        </div>
      )}

      {/* 4. Scratched Vinyl Indicator Banner */}
      {hasVinyl && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-pink-950/90 border border-pink-500/50 backdrop-blur-md text-pink-200 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold tracking-wide animate-shake">
          <span className="text-base animate-spin">💿</span>
          <span>{t('vinylWarn')}</span>
        </div>
      )}

      {/* 5. Parasite Leech Badge */}
      {hasLeech && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 bg-red-950/90 border border-red-500/50 backdrop-blur-md text-red-200 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold tracking-wide animate-pulse">
          <span className="text-base">🪱</span>
          <span>{t('leechWarn')} (-450 pts)</span>
        </div>
      )}

      {/* 6. Jumble Notice */}
      {hasJumble && (
        <div className="fixed top-36 left-1/2 -translate-x-1/2 z-40 bg-orange-950/90 border border-orange-500/50 backdrop-blur-md text-orange-200 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold tracking-wide">
          <span className="text-base">🔀</span>
          <span>{t('jumbleWarn')}</span>
        </div>
      )}

      {/* 7. Ink Splat Wipeable Blotches (8 spots, 2 hits each) */}
      {inkSpots.length > 0 && (
        <div className="fixed inset-0 z-50 pointer-events-auto bg-black/40 backdrop-blur-[3px]">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-neutral-950/90 border border-purple-500/50 text-white font-black text-sm px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 animate-bounce">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{t('wipeInk')}</span>
            <span className="text-xs text-purple-300 font-mono">
              ({inkSpots.reduce((acc, s) => acc + s.hp, 0)} wipes left!)
            </span>
          </div>

          {inkSpots.map((spot) => (
            <button
              key={spot.id}
              onClick={() => handleWipeSpot(spot.id)}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: `${spot.size * (spot.hp === 1 ? 0.75 : 1)}px`,
                height: `${spot.size * (spot.hp === 1 ? 0.75 : 1)}px`,
                transform: `translate(-50%, -50%) rotate(${spot.rotation}deg)`,
              }}
              className="absolute cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none"
              title="Click to wipe ink!"
            >
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.95)]">
                <path
                  d="M100,20 C135,15 160,40 170,75 C180,110 160,150 130,170 C100,190 60,185 35,155 C10,125 15,85 45,50 C75,15 65,25 100,20 Z"
                  fill={spot.hp === 1 ? '#180e29' : '#0a0512'}
                  opacity={spot.hp === 1 ? 0.85 : 0.98}
                />
                <circle cx="50" cy="40" r="16" fill="#0a0512" />
                <circle cx="165" cy="140" r="22" fill="#0a0512" />
                <circle cx="140" cy="30" r="14" fill="#0a0512" />
                <circle cx="35" cy="150" r="18" fill="#0a0512" />
                {spot.hp === 1 && (
                  <text x="90" y="110" fill="#a855f7" fontSize="26" fontWeight="bold" textAnchor="middle">
                    1 HIT!
                  </text>
                )}
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 8. Moo Deng Captcha Modal (6 tiles) */}
      {captchaOpen && !captchaSolved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div
            className={`glass-strong rounded-3xl max-w-md w-full p-6 text-center border-2 border-pink-500/50 shadow-2xl relative bg-neutral-950/95 ${
              buzzError ? 'animate-shake border-rose-500' : ''
            }`}
          >
            <div className="w-14 h-14 mx-auto mb-2 bg-pink-500/20 border border-pink-400 rounded-full flex items-center justify-center text-3xl shadow-lg">
              🦛
            </div>
            <h3 className="text-xl font-black text-white">{t('captchaTitle')}</h3>
            <p className="text-xs text-pink-300 mt-1 mb-4 font-bold">
              Select ALL 3 Moo Deng photos! Wrong choice buzzes and resets!
            </p>

            {/* 3x2 Image Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {tiles.map((tile) => {
                const isSelected = selectedTiles.includes(tile.id);
                return (
                  <button
                    key={tile.id}
                    onClick={() => toggleTile(tile.id)}
                    className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all duration-200 group cursor-pointer ${
                      isSelected
                        ? 'border-pink-500 ring-4 ring-pink-500/40 scale-95'
                        : 'border-white/10 hover:border-pink-400/50 hover:scale-102'
                    }`}
                  >
                    <img
                      src={tile.img}
                      alt={tile.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-pink-600/40 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={verifyCaptcha}
              className="btn-primary w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-sm shadow-lg shadow-pink-500/30 cursor-pointer"
            >
              {t('verify')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
