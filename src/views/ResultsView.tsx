import React, { useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { music } from '../lib/audio';
import { client } from '../lib/net';
import type { RoomState } from '../../shared/types';
import { Trophy, RotateCcw, LogOut, Medal, Target, Gauge, Flame, Sparkles } from 'lucide-react';

interface Props {
  room: RoomState;
  you: string | null;
}

export const ResultsView: React.FC<Props> = ({ room, you }) => {
  const { t } = useI18n();
  const me = room.players.find((p) => p.id === you);
  const isHost = (room.hostId && you && room.hostId === you) || (me?.isHost ?? false) || (room.players.filter((p) => !p.isBot).length <= 1);

  // Sort players by final score
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const champion = sorted[0];
  const isMeChampion = champion?.id === you;

  useEffect(() => {
    music.stop();
    sfx.victory();
  }, []);

  const handlePlayAgain = () => {
    sfx.click();
    client.send({ t: 'playAgain' });
  };

  const handleLeave = () => {
    sfx.click();
    client.send({ t: 'leave' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-up">
      {/* Top Victory Banner */}
      <div className="glass-strong rounded-3xl p-6 md:p-8 border border-yellow-400/30 text-center shadow-2xl relative overflow-hidden bg-gradient-to-b from-yellow-950/20 to-ink">
        <div className="w-16 h-16 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">
          <Trophy className="w-9 h-9" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-1 block">
          {t('matchOver')}
        </span>

        <h2 className="text-3xl md:text-5xl font-black text-white">
          {isMeChampion ? '🏆 Victory!' : `${champion?.name} Wins!`}
        </h2>

        <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto">
          Final scores submitted to the Global Hall of Fame.
        </p>
      </div>

      {/* Top 3 Podium Spotlight */}
      <div className="grid grid-cols-3 gap-3 items-end pt-4">
        {/* Silver #2 */}
        {sorted[1] ? (
          <div className="glass rounded-2xl p-4 text-center border-t-2 border-slate-300 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-300/20 text-2xl flex items-center justify-center mb-2 shadow-inner">
              {sorted[1].avatar}
            </div>
            <div className="text-xl mb-1">🥈</div>
            <div className="text-sm font-black text-white truncate max-w-full">
              {sorted[1].name}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
              {sorted[1].score.toLocaleString()} pts
            </div>
          </div>
        ) : <div />}

        {/* Gold #1 Champion */}
        {champion && (
          <div className="glass-strong rounded-2xl p-6 text-center border-t-4 border-yellow-400 flex flex-col items-center shadow-2xl shadow-yellow-500/15 scale-105 relative">
            <div className="w-16 h-16 rounded-full bg-yellow-400/20 text-3xl flex items-center justify-center mb-2 ring-4 ring-yellow-400/30">
              {champion.avatar}
            </div>
            <div className="text-2xl mb-1">🥇</div>
            <div className="text-base font-black text-white truncate max-w-full">
              {champion.name}
            </div>
            <div className="text-sm font-mono font-black text-yellow-400 mt-1">
              {champion.score.toLocaleString()} pts
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-yellow-500 mt-1">
              {t('champion')}
            </span>
          </div>
        )}

        {/* Bronze #3 */}
        {sorted[2] ? (
          <div className="glass rounded-2xl p-4 text-center border-t-2 border-amber-600 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-600/20 text-2xl flex items-center justify-center mb-2 shadow-inner">
              {sorted[2].avatar}
            </div>
            <div className="text-xl mb-1">🥉</div>
            <div className="text-sm font-black text-white truncate max-w-full">
              {sorted[2].name}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
              {sorted[2].score.toLocaleString()} pts
            </div>
          </div>
        ) : <div />}
      </div>

      {/* Your Personal Match Performance Cards */}
      {me && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-2xl p-4 text-center border border-white/5">
            <Target className="w-5 h-5 mx-auto text-spotify mb-1" />
            <div className="text-xs font-bold text-neutral-400">{t('accuracy')}</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {me.answeredCount > 0 ? Math.round((me.correct / me.answeredCount) * 100) : 0}%
            </div>
          </div>

          <div className="glass rounded-2xl p-4 text-center border border-white/5">
            <Gauge className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
            <div className="text-xs font-bold text-neutral-400">{t('avgSpeed')}</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {me.answeredCount > 0 ? (me.totalSpeedMs / me.answeredCount / 1000).toFixed(1) : '0.0'}s
            </div>
          </div>

          <div className="glass rounded-2xl p-4 text-center border border-white/5">
            <Flame className="w-5 h-5 mx-auto text-orange-400 mb-1" />
            <div className="text-xs font-bold text-neutral-400">{t('bestStreak')}</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {me.bestStreak}×
            </div>
          </div>

          <div className="glass rounded-2xl p-4 text-center border border-white/5">
            <Trophy className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <div className="text-xs font-bold text-neutral-400">{t('score')}</div>
            <div className="text-lg font-black text-yellow-400 font-mono mt-0.5">
              {me.score.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Standings Table */}
      <div className="glass rounded-3xl p-5 border border-white/10 space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-2">
          {t('finalStandings')}
        </h4>

        {sorted.map((p, idx) => (
          <div
            key={p.id}
            className={`p-3.5 rounded-2xl flex items-center justify-between border ${
              p.id === you
                ? 'bg-spotify/15 border-spotify/30 ring-1 ring-spotify/30'
                : 'bg-white/5 border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center font-mono font-black text-xs text-neutral-500">
                #{idx + 1}
              </span>
              <span className="text-2xl">{p.avatar}</span>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>{p.name}</span>
                  {p.id === you && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-spotify/20 text-spotify font-black uppercase">
                      {t('you')}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {p.correct} correct • {p.bestStreak}× streak
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono font-black text-base text-emerald-400">
                {p.score.toLocaleString()} {t('points')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Host Controls & Leave Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <button
          onClick={handleLeave}
          className="btn-ghost text-xs font-bold text-neutral-300 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('backHome')}</span>
        </button>

        {isHost ? (
          <button
            onClick={handlePlayAgain}
            className="btn-primary py-3.5 px-8 text-sm font-black shadow-lg shadow-spotify/25 flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('playAgain')}</span>
          </button>
        ) : (
          <span className="text-xs text-neutral-400 italic">
            {t('waitingHostRestart')}
          </span>
        )}
      </div>
    </div>
  );
};
