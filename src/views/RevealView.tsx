import React, { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { client } from '../lib/net';
import type { RoomState } from '../../shared/types';
import { CheckCircle2, XCircle, Flame, Zap, Disc3, Music2, Clock } from 'lucide-react';

interface Props {
  room: RoomState;
  you: string | null;
}

export const RevealView: React.FC<Props> = ({ room, you }) => {
  const { t } = useI18n();
  const reveal = room.reveal;
  const me = room.players.find((p) => p.id === you);
  const myResult = you && reveal?.results ? reveal.results[you] : null;

  // Play result sound on mount
  useEffect(() => {
    if (myResult?.correct) {
      sfx.correct();
      if ((me?.streak ?? 0) >= 3) {
        setTimeout(() => sfx.streak(), 400);
      }
    } else {
      sfx.wrong();
    }
  }, [reveal?.correctIndex]);

  // Next round timer
  const [secondsLeft, setSecondsLeft] = useState(4);
  useEffect(() => {
    const timer = setInterval(() => {
      if (room.phaseEndsAt) {
        const rem = Math.max(0, Math.ceil((room.phaseEndsAt - client.now()) / 1000));
        setSecondsLeft(rem);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [room.phaseEndsAt]);

  if (!reveal) return null;

  const track = reveal.track;
  const isCorrect = myResult?.correct ?? false;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-up">
      {/* Top Correct / Wrong Badge */}
      <div
        className={`glass-strong rounded-3xl p-6 md:p-8 border text-center shadow-2xl relative overflow-hidden ${
          isCorrect
            ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-ink'
            : 'border-rose-500/40 bg-gradient-to-b from-rose-950/40 to-ink'
        }`}
      >
        <div className="flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg ${
              isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400' : 'bg-rose-500/20 text-rose-400 border border-rose-400'
            }`}
          >
            {isCorrect ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white">
            {isCorrect ? t('correct') : t('wrong')}
          </h2>

          {isCorrect && myResult && (
            <div className="mt-2 text-2xl md:text-3xl font-mono font-black text-emerald-400">
              +{myResult.points.toLocaleString()} {t('points')}
            </div>
          )}

          {/* Points Breakdown Badges */}
          {isCorrect && myResult && (
            <div className="flex flex-wrap gap-2 justify-center mt-3 text-xs font-bold">
              {myResult.multiplier > 1 && (
                <span className="chip bg-orange-500/20 text-orange-400 border-orange-500/30">
                  <Flame className="w-3.5 h-3.5 fill-orange-400" />
                  {myResult.multiplier}× Multiplier
                </span>
              )}
              {myResult.doubled && (
                <span className="chip bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  ⚡ 2× Double Down
                </span>
              )}
              {myResult.micBonus > 0 && (
                <span className="chip bg-pink-500/20 text-pink-300 border-pink-500/30">
                  🎤 +{myResult.micBonus} Mic Bonus
                </span>
              )}
              {myResult.gained > 0 && (
                <span className="chip bg-green-500/20 text-green-300 border-green-500/30">
                  🪱 +{myResult.gained} Leech Steal
                </span>
              )}
              {myResult.stolen > 0 && (
                <span className="chip bg-red-500/20 text-red-300 border-red-500/30">
                  🪱 −{myResult.stolen} Leeched
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Track Details & Artwork Showcase */}
      <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
        {/* Album Artwork / Disc */}
        <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/20 bg-neutral-900 relative group">
          {track.artwork ? (
            <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-spotify/20">
              <Disc3 className="w-16 h-16 text-spotify animate-spin-slow" />
            </div>
          )}
        </div>

        {/* Track Title, Artist, Year */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-spotify">
            {t('nowPlaying')}
          </span>
          <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
            {track.title}
          </h3>
          <p className="text-lg font-bold text-neutral-300">
            {track.artist}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-2 text-xs font-bold text-neutral-400">
            {track.year > 0 && (
              <span className="chip bg-white/5 border-white/10">
                Released: {track.year}
              </span>
            )}
            <span className="chip bg-white/5 border-white/10 uppercase">
              {t(`genre_${track.genre}`)}
            </span>
          </div>
        </div>

        {/* Next Round Countdown */}
        <div className="shrink-0 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
          <span className="text-xs text-neutral-400 block mb-1">Next round in</span>
          <span className="text-3xl font-mono font-black text-spotify">{secondsLeft}s</span>
        </div>
      </div>

      {/* Rivals Standings Snapshot for this round */}
      <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400">
          {t('scoreboard')}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {room.players.map((p) => {
            const res = reveal.results[p.id];
            return (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{p.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>{p.name}</span>
                      {res?.correct ? (
                        <span className="text-emerald-400 text-[10px]">✓</span>
                      ) : (
                        <span className="text-rose-400 text-[10px]">✗</span>
                      )}
                    </div>
                    {p.streak >= 2 && (
                      <span className="text-[10px] text-orange-400 font-bold">
                        {p.streak}× {t('streak')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-xs text-white">
                    {p.score.toLocaleString()} pts
                  </span>
                  {res && res.points > 0 && (
                    <span className="text-[10px] text-emerald-400 block font-mono">
                      +{res.points}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
