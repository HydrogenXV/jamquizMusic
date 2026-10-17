import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { CARD_IDS, CARDS, RARITY_COLORS } from '../../shared/game';
import { CardArt } from './CardArt';
import type { CardId, Rarity } from '../../shared/types';
import { X, Volume2, Shield, Flame, Sparkles, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CardCompendiumModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useI18n();
  const [filterKind, setFilterKind] = useState<'all' | 'buff' | 'sabotage'>('all');
  const [selectedCardId, setSelectedCardId] = useState<CardId>('purge');

  if (!open) return null;

  const filteredCards = CARD_IDS.filter((id) => {
    if (filterKind === 'all') return true;
    return CARDS[id].kind === filterKind;
  });

  const activeCard = CARDS[selectedCardId];

  const handleTestSfx = (id: CardId) => {
    sfx.card(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
      <div className="glass-strong rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl relative">
        {/* Top Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-black text-white">{t('compTitle')}</h2>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">{t('compSub')}</p>
          </div>
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 bg-black/30 border-b border-white/5 flex gap-2 overflow-x-auto">
          {(['all', 'buff', 'sabotage'] as const).map((kind) => (
            <button
              key={kind}
              onClick={() => {
                sfx.click();
                setFilterKind(kind);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterKind === kind
                  ? 'bg-spotify text-black shadow-lg shadow-spotify/30'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {kind === 'all' ? t('all') : kind === 'buff' ? t('buff') : t('sabotage')}
            </button>
          ))}
        </div>

        {/* Main Content: Left Cards Grid + Right Detail Lore Panel */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Cards Grid */}
          <div className="md:col-span-7 p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredCards.map((id) => {
              const card = CARDS[id];
              const isSelected = selectedCardId === id;
              const isLegendary = card.rarity === 'legendary';

              return (
                <div
                  key={id}
                  onClick={() => {
                    sfx.click();
                    setSelectedCardId(id);
                  }}
                  className={`relative cursor-pointer rounded-2xl p-2.5 transition-all duration-200 border text-center flex flex-col items-center group ${
                    isSelected
                      ? 'border-spotify bg-white/10 ring-2 ring-spotify/40 scale-102'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                  } ${isLegendary ? 'foil' : ''}`}
                >
                  <div className="w-24 h-28 my-1 relative">
                    <CardArt id={id} />
                  </div>
                  <div className="mt-2 text-xs font-black text-white group-hover:text-spotify transition-colors">
                    {t(`card_${id}`)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-400 font-bold">
                    <span
                      style={{ color: RARITY_COLORS[card.rarity] }}
                      className="uppercase tracking-wider"
                    >
                      {t(`rarity_${card.rarity}`)}
                    </span>
                    <span>•</span>
                    <span className="text-cyan-400">{card.cost} {t('mana')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card Lore & Inspection Panel */}
          <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-white/10 p-6 flex flex-col justify-between bg-black/40 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between">
                <span
                  style={{ color: RARITY_COLORS[activeCard.rarity] }}
                  className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/5 border border-white/10"
                >
                  {t(`rarity_${activeCard.rarity}`)}
                </span>
                <span className="text-sm font-black text-cyan-400 flex items-center gap-1">
                  <Zap className="w-4 h-4 fill-cyan-400" />
                  {activeCard.cost} {t('mana')}
                </span>
              </div>

              {/* Card Title & Art */}
              <div className="my-5 flex flex-col items-center">
                <div className={`w-36 h-44 rounded-2xl overflow-hidden shadow-2xl ${activeCard.rarity === 'legendary' ? 'foil' : ''}`}>
                  <CardArt id={selectedCardId} />
                </div>
                <h3 className="text-xl font-black text-white mt-4 text-center">
                  {t(`card_${selectedCardId}`)}
                </h3>
                <span className="text-xs font-bold text-neutral-400 mt-0.5">
                  {activeCard.kind === 'buff' ? `🛡️ ${t('buff')}` : `💥 ${t('sabotage')}`}
                </span>
              </div>

              {/* Description & Lore */}
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-200 font-medium leading-relaxed">
                  {t(`card_${selectedCardId}_desc`)}
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                    {t('lore')}
                  </h4>
                  <p className="text-xs italic text-neutral-400 leading-relaxed font-serif">
                    “{t(`card_${selectedCardId}_lore`)}”
                  </p>
                </div>
              </div>
            </div>

            {/* Test SFX Action */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => handleTestSfx(selectedCardId)}
                className="btn-ghost w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold border-emerald-500/30 hover:border-emerald-400"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                {t('testSfx')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
