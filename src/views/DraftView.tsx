import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { client } from '../lib/net';
import { CARDS, RARITY_COLORS } from '../../shared/game';
import { CardArt } from '../components/CardArt';
import type { CardId, RoomState } from '../../shared/types';
import { Sparkles, CheckCircle2, Clock, Zap } from 'lucide-react';

interface Props {
  room: RoomState;
  you: string | null;
}

export const DraftView: React.FC<Props> = ({ room, you }) => {
  const { t } = useI18n();
  const me = room.players.find((p) => p.id === you);
  const options = room.me?.draftOptions ?? [];
  const [selected, setSelected] = useState<CardId[]>([]);
  const isDrafted = me?.drafted ?? false;

  const togglePick = (id: CardId) => {
    if (isDrafted) return;
    sfx.click();
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      if (selected.length < 3) {
        setSelected([...selected, id]);
      }
    }
  };

  const handleLockIn = () => {
    if (selected.length !== 3 || isDrafted) return;
    sfx.correct();
    client.send({ t: 'draftPick', cards: selected });
  };

  // Remaining draft time
  const [timeLeft, setTimeLeft] = useState(20);
  useEffect(() => {
    const timer = setInterval(() => {
      if (room.phaseEndsAt) {
        const rem = Math.max(0, Math.ceil((room.phaseEndsAt - client.now()) / 1000));
        setTimeLeft(rem);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [room.phaseEndsAt]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 animate-fade-up">
      {/* Draft Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-spotify/15 border border-spotify/30 text-spotify text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('draftTitle')}</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white">
          {t('draftTitle')}
        </h2>
        <p className="text-sm text-neutral-400 max-w-lg mx-auto">
          {t('draftSub')}
        </p>

        {/* Timer Bar */}
        <div className="flex items-center justify-center gap-2 text-sm font-mono font-bold text-yellow-400 mt-2">
          <Clock className="w-4 h-4 animate-spin-slow" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* 5-Card Pick Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4">
        {options.map((id) => {
          const card = CARDS[id];
          const isSelected = selected.includes(id);
          const isLegendary = card.rarity === 'legendary';

          return (
            <div
              key={id}
              onClick={() => togglePick(id)}
              className={`glass-strong rounded-3xl p-4 cursor-pointer transition-all duration-200 border flex flex-col items-center text-center relative group select-none ${
                isSelected
                  ? 'border-spotify bg-spotify/15 ring-4 ring-spotify/40 scale-102 -translate-y-2'
                  : 'border-white/10 hover:border-white/25 hover:-translate-y-1'
              } ${isLegendary ? 'foil' : ''}`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 bg-spotify text-black rounded-full p-1 shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}

              {/* Mana Cost Pill */}
              <div className="self-start px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-[11px] font-black text-cyan-400 flex items-center gap-1 mb-2">
                <Zap className="w-3 h-3 fill-cyan-400" />
                <span>{card.cost} {t('mana')}</span>
              </div>

              {/* Artwork */}
              <div className="w-28 h-32 my-1">
                <CardArt id={id} />
              </div>

              {/* Title & Rarity */}
              <h4 className="text-sm font-black text-white mt-2 group-hover:text-spotify transition-colors">
                {t(`card_${id}`)}
              </h4>
              <span
                style={{ color: RARITY_COLORS[card.rarity] }}
                className="text-[10px] uppercase font-black tracking-wider mt-0.5"
              >
                {t(`rarity_${card.rarity}`)}
              </span>

              {/* Card Description */}
              <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed">
                {t(`card_${id}_desc`)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Dock */}
      <div className="glass rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Status */}
        <div className="text-sm font-bold text-neutral-300 flex items-center gap-2">
          <span>{selected.length}/3 selected</span>
          {isDrafted && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-spotify/20 text-spotify font-black">
              ✓ {t('drafted')}
            </span>
          )}
        </div>

        {/* Lock In Button */}
        <button
          onClick={handleLockIn}
          disabled={selected.length !== 3 || isDrafted}
          className="btn-primary py-3 px-8 text-sm font-black shadow-lg shadow-spotify/25 cursor-pointer disabled:cursor-not-allowed"
        >
          {isDrafted ? t('waitingOthers') : t('lockIn')}
        </button>
      </div>

      {/* Rivals Status Strip */}
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        {room.players.map((p) => (
          <div
            key={p.id}
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              p.drafted
                ? 'bg-spotify/20 border-spotify/40 text-spotify'
                : 'bg-white/5 border-white/10 text-neutral-400'
            }`}
          >
            <span>{p.avatar}</span>
            <span>{p.name}</span>
            <span>{p.drafted ? '✓' : '…'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
