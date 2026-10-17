import React, { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import type { LeaderboardEntry } from '../../shared/types';
import { GENRES } from '../../shared/game';
import { getApiUrl } from '../lib/net';
import { Trophy, X, Medal, Zap, Target, Gauge } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState<string>('all');
  const [sort, setSort] = useState<'score' | 'accuracy' | 'speed'>('score');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(getApiUrl(`/api/leaderboard?genre=${genre}&sort=${sort}`))
      .then((res) => res.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, genre, sort]);

  if (!open) return null;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
      <div className="glass-strong rounded-3xl max-w-3xl w-full h-[85vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-black text-white">{t('lbTitle')}</h2>
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">{t('lbSub')}</p>
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

        {/* Filter & Sort Bar */}
        <div className="p-4 bg-black/30 border-b border-white/5 flex flex-wrap gap-3 items-center justify-between">
          {/* Genre selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => {
                sfx.click();
                setGenre('all');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                genre === 'all' ? 'bg-spotify text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              }`}
            >
              {t('allGenres')}
            </button>
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  sfx.click();
                  setGenre(g.id);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap ${
                  genre === g.id ? 'bg-spotify text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                <span>{g.icon}</span>
                <span>{t(`genre_${g.id}`)}</span>
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            {(['score', 'accuracy', 'speed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  sfx.click();
                  setSort(s);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  sort === s ? 'bg-white/20 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s === 'score' ? t('sortScore') : s === 'accuracy' ? t('sortAccuracy') : t('sortSpeed')}
              </button>
            ))}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-neutral-400">
              Loading rankings…
            </div>
          ) : entries.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-400 text-sm">
              <Trophy className="w-10 h-10 opacity-30 mb-2" />
              <span>{t('noEntries')}</span>
            </div>
          ) : (
            <div>
              {/* Top 3 Spotlight Podium */}
              {top3.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-8 items-end pt-4">
                  {/* Silver (#2) */}
                  {top3[1] ? (
                    <div className="glass rounded-2xl p-4 text-center border-t-2 border-slate-300 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-300/20 text-2xl flex items-center justify-center mb-2 shadow-inner">
                        {top3[1].avatar}
                      </div>
                      <div className="text-xl mb-1">🥈</div>
                      <div className="text-sm font-black text-white truncate max-w-full">
                        {top3[1].name}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                        {top3[1].score.toLocaleString()} {t('points')}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {Math.round(top3[1].accuracy * 100)}% acc
                      </div>
                    </div>
                  ) : <div />}

                  {/* Gold Champion (#1) */}
                  {top3[0] && (
                    <div className="glass-strong rounded-2xl p-5 text-center border-t-4 border-yellow-400 flex flex-col items-center shadow-xl shadow-yellow-500/10 scale-105 relative">
                      <div className="w-16 h-16 rounded-full bg-yellow-400/20 text-3xl flex items-center justify-center mb-2 ring-4 ring-yellow-400/30">
                        {top3[0].avatar}
                      </div>
                      <div className="text-2xl mb-1">🥇</div>
                      <div className="text-base font-black text-white truncate max-w-full">
                        {top3[0].name}
                      </div>
                      <div className="text-sm font-mono font-black text-yellow-400 mt-1">
                        {top3[0].score.toLocaleString()} {t('points')}
                      </div>
                      <div className="text-[11px] text-neutral-300 mt-0.5">
                        {Math.round(top3[0].accuracy * 100)}% acc • {(top3[0].avgSpeedMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  )}

                  {/* Bronze (#3) */}
                  {top3[2] ? (
                    <div className="glass rounded-2xl p-4 text-center border-t-2 border-amber-600 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-amber-600/20 text-2xl flex items-center justify-center mb-2 shadow-inner">
                        {top3[2].avatar}
                      </div>
                      <div className="text-xl mb-1">🥉</div>
                      <div className="text-sm font-black text-white truncate max-w-full">
                        {top3[2].name}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                        {top3[2].score.toLocaleString()} {t('points')}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {Math.round(top3[2].accuracy * 100)}% acc
                      </div>
                    </div>
                  ) : <div />}
                </div>
              )}

              {/* Ranks 4+ List */}
              {rest.length > 0 && (
                <div className="space-y-2">
                  {rest.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="glass rounded-xl px-4 py-3 flex items-center justify-between text-sm hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-mono font-black text-neutral-500 text-xs">
                          #{idx + 4}
                        </span>
                        <span className="text-xl">{entry.avatar}</span>
                        <div>
                          <div className="font-bold text-white">{entry.name}</div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <span>{t(`genre_${entry.genre}`)}</span>
                            <span>•</span>
                            <span>{t(`mode_${entry.mode}`)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">
                          {entry.score.toLocaleString()} {t('points')}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {Math.round(entry.accuracy * 100)}% • {(entry.avgSpeedMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
