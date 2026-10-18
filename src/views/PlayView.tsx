import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { music } from '../lib/audio';
import { mic } from '../lib/mic';
import { client } from '../lib/net';
import { CARDS, MODES, RARITY_COLORS } from '../../shared/game';
import { Visualizer } from '../components/Visualizer';
import { SabotageOverlays } from '../components/SabotageOverlays';
import { CardArt } from '../components/CardArt';
import type { CardId, RoomState } from '../../shared/types';
import {
  Zap, Clock, Flame, Shield, Radio, Sparkles, AlertCircle,
  Mic, User, ChevronUp, ChevronDown, RotateCcw, LogOut,
  Trophy, Crown, Medal, CheckCircle2, TrendingUp, X, Check
} from 'lucide-react';

interface Props {
  room: RoomState;
  you: string | null;
}

export const PlayView: React.FC<Props> = ({ room, you }) => {
  const { t, lang } = useI18n();
  const round = room.round;
  const me = room.players.find((p) => p.id === you);
  const priv = room.me;
  const modeDef = MODES[room.settings.mode];
  const isHost = (room.hostId && you && room.hostId === you) || (me?.isHost ?? false) || (room.players.filter((p) => !p.isBot).length <= 1);

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [targetCard, setTargetCard] = useState<CardId | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [micScoreBonus, setMicScoreBonus] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRematch, setConfirmRematch] = useState(false);

  // Real-time ranking calculation
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const myRank = sortedPlayers.findIndex((p) => p.id === you) + 1;
  const leader = sortedPlayers[0];
  const scoreDiff = leader && me && leader.id !== me.id ? leader.score - me.score : 0;

  // Audio Playback Lifecycle
  useEffect(() => {
    if (!round) return;

    if (room.phase === 'countdown') {
      music.prepare({
        previewUrl: round.previewUrl,
        seed: round.synthSeed,
        offset: round.previewOffset,
      });
      setSelectedChoice(null);
      setMicScoreBonus(0);
    } else if (room.phase === 'playing') {
      music.start({
        previewUrl: round.previewUrl,
        seed: round.synthSeed,
        offset: round.previewOffset,
      });
    }

    return () => {
      if (room.phase === 'playing') {
        music.fadeOut(400);
      }
    };
  }, [room.phase, round?.index]);

  // Audio Filter Effects sync from Active Cards
  useEffect(() => {
    const hasVinyl = priv?.effects.some((e) => e.card === 'vinyl') ?? false;
    const hasGlitch = priv?.effects.some((e) => e.card === 'glitch') ?? false;
    const hasClarity = priv?.clarity ?? false;

    music.setFx({
      vinyl: hasVinyl,
      glitch: hasGlitch,
      clarity: hasClarity,
    });
  }, [priv?.effects, priv?.clarity]);

  // Mic Mayhem pitch/energy tracking
  useEffect(() => {
    if (room.settings.mode !== 'mic' || room.phase !== 'playing') return;

    let animId: number;
    let accum = 0;

    const trackMic = () => {
      animId = requestAnimationFrame(trackMic);
      if (mic.active) {
        const reading = mic.read();
        if (reading.level > 0.08) {
          accum += reading.level * 4;
          const bonus = Math.min(500, Math.round(accum));
          setMicScoreBonus(bonus);
        }
      }
    };

    trackMic();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [room.settings.mode, room.phase]);

  const handleEnableMic = async () => {
    sfx.click();
    const ok = await mic.start();
    setMicActive(ok);
  };

  // Timer Calculation
  const [timePct, setTimePct] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    if (room.phase !== 'playing' || !priv || !priv.deadline) return;

    const interval = setInterval(() => {
      const now = client.now();
      const remMs = Math.max(0, priv.deadline - now);
      const totalMs = priv.totalTime || 10000;
      const pct = Math.min(100, Math.max(0, (remMs / totalMs) * 100));
      setTimePct(pct);
      setSecondsLeft(Math.ceil(remMs / 1000));
    }, 50);

    return () => clearInterval(interval);
  }, [room.phase, priv?.deadline, priv?.totalTime]);

  if (!round) return null;

  // Handle Answer selection
  const handleSelectAnswer = (idx: number) => {
    if (room.phase !== 'playing' || selectedChoice !== null || me?.hasAnswered) return;
    sfx.click();
    setSelectedChoice(idx);
    client.send({ t: 'answer', choice: idx, micBonus: micScoreBonus });
  };

  // Handle Ability Card Cast
  const handleCardCastClick = (cardId: CardId) => {
    const def = CARDS[cardId];
    if (!def) return;
    sfx.click();

    if (def.kind === 'buff') {
      // Self buff executes immediately
      sfx.card(cardId);
      client.send({ t: 'cast', card: cardId, target: 'all' });
    } else {
      // Sabotage requires target selection
      setTargetCard(cardId);
    }
  };

  const handleConfirmSabotageTarget = (targetId: string | 'all') => {
    if (!targetCard) return;
    sfx.card(targetCard);
    client.send({ t: 'cast', card: targetCard, target: targetId });
    setTargetCard(null);
  };

  // Choice order jumble effect
  const hasJumble = priv?.effects.some((e) => e.card === 'jumble');
  const choicesOrder = hasJumble ? [2, 0, 3, 1] : [0, 1, 2, 3];

  const isFrozen = !!(priv?.frozenUntil && client.now() < priv.frozenUntil);
  const isBlackout = round.globalEvent?.type === 'blackout' && timePct > 65;
  const isEarthquake = round.globalEvent?.type === 'earthquake';

  return (
    <div className={`max-w-5xl mx-auto p-3 md:p-6 space-y-4 animate-fade-up relative min-h-[calc(100vh-80px)] flex flex-col justify-between ${isEarthquake ? 'animate-shake' : ''}`}>
      {/* Active Sabotage Overlays (Ink Splat, Captcha, Glitch, Freeze, Smoke) */}
      <SabotageOverlays effects={priv?.effects ?? []} />

      {/* High-Risk Ascension Challenge Modal */}
      {priv?.challenge?.status === 'pending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="glass-strong rounded-3xl max-w-md w-full p-6 text-center border-2 border-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.35)] relative bg-neutral-950/95">
            <div className="w-16 h-16 mx-auto mb-3 bg-yellow-500/20 border-2 border-yellow-400 rounded-full flex items-center justify-center text-3xl shadow-lg">
              ⚡
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-yellow-400 block mb-1">
              High-Risk Choice Event
            </span>
            <h3 className="text-2xl font-black text-white">Do you accept this challenge?</h3>

            <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2.5 text-xs">
              <div className="flex items-start gap-2 text-emerald-300">
                <span className="font-bold shrink-0">🎯 Goal:</span>
                <span>Answer 3 questions in a row correctly.</span>
              </div>
              <div className="flex items-start gap-2 text-yellow-300">
                <span className="font-bold shrink-0">🏆 Reward:</span>
                <span className="font-black">Jump directly to 1st Place!</span>
              </div>
              <div className="flex items-start gap-2 text-rose-300">
                <span className="font-bold shrink-0">💀 Risk:</span>
                <span className="font-black">Wrong answer drops you straight to DEAD LAST!</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  sfx.click();
                  client.send({ t: 'acceptChallenge', accept: true });
                }}
                className="btn-primary py-3 font-black text-xs sm:text-sm bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30 cursor-pointer"
              >
                🔥 Accept Challenge!
              </button>
              <button
                onClick={() => {
                  sfx.click();
                  client.send({ t: 'acceptChallenge', accept: false });
                }}
                className="btn-ghost py-3 font-bold text-xs sm:text-sm text-neutral-300 border-white/10 hover:bg-white/10 cursor-pointer"
              >
                🛡️ Play Safe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HUD: Round Number, Clues, Timer bar, Score, Streak */}
      <div className="glass-strong rounded-3xl p-4 md:p-5 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          {/* Round & Mode badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-white/10 text-white font-mono">
              {t('round')} {round.index + 1}/{round.total}
            </span>
            {round.era && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {t('era')}: {round.era}
              </span>
            )}
          </div>

          {/* Active Buffs (Double Down / Shield / Warp / Frenzy / Ascension) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {priv?.challenge?.active && priv.challenge.accepted && (
              <span className="chip bg-yellow-500/25 text-yellow-300 border-yellow-400/50 animate-pulse text-[11px] font-black">
                ⚡ Ascension: {priv.challenge.currentStreak}/3
              </span>
            )}
            {priv?.doubleDown && (
              <span className="chip bg-yellow-500/20 text-yellow-300 border-yellow-500/30 animate-pulse text-[11px]">
                ⚡ {t('doubleDownActive')}
              </span>
            )}
            {priv?.shield && (
              <span className="chip bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[11px]">
                🛡️ Sonic Shield
              </span>
            )}
            {priv?.frenzy && (
              <span className="chip bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse text-[11px]">
                🔥 Score Frenzy
              </span>
            )}
            {priv?.warp && (
              <span className="chip bg-purple-500/20 text-purple-300 border-purple-500/30 text-[11px]">
                ⏳ {t('warpActive')}
              </span>
            )}
          </div>

          {/* Player Rank, Score, Streak & Match Actions */}
          <div className="flex items-center gap-2.5">
            {/* Realtime Rank Badge Pill */}
            <button
              onClick={() => {
                sfx.click();
                setShowLeaderboard(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border transition-all cursor-pointer shadow-md ${
                myRank === 1
                  ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300 shadow-yellow-500/20'
                  : myRank === 2
                  ? 'bg-slate-400/20 border-slate-300/40 text-slate-200 shadow-slate-400/10'
                  : myRank === 3
                  ? 'bg-amber-700/20 border-amber-600/40 text-amber-300 shadow-amber-700/10'
                  : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
              }`}
              title={lang === 'th' ? 'คลิกดูตารางอันดับคะแนน Real-time' : 'Click to view live match leaderboard'}
            >
              {myRank === 1 ? (
                <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-bounce" />
              ) : (
                <Trophy className="w-3.5 h-3.5 text-spotify" />
              )}
              <span className="font-black text-xs">
                {lang === 'th' ? `อันดับ #${myRank}` : `Rank #${myRank}`}
              </span>
              {scoreDiff > 0 && (
                <span className="text-[10px] text-neutral-400 font-mono hidden md:inline">
                  (-{scoreDiff.toLocaleString()})
                </span>
              )}
            </button>

            {me && me.streak >= 2 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 font-black text-xs animate-bounce">
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>
                  {me.streak}× ({modeDef.streakStep > 0.1 ? 'Blitz Combo' : t('streak')})
                </span>
              </div>
            )}
            <div className="text-right">
              <span className="text-xs font-black text-neutral-400 block leading-none">{t('score')}</span>
              <span className="font-mono font-black text-base md:text-lg text-emerald-400">
                {me?.score.toLocaleString()}
              </span>
            </div>

            {/* Actions: Rematch (if host) & Leave Game */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              {isHost && (
                <button
                  onClick={() => setConfirmRematch(true)}
                  className="p-1.5 md:px-2.5 md:py-1 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  title={t('rematch')}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="hidden sm:inline">{t('rematch')}</span>
                </button>
              )}
              <button
                onClick={() => setConfirmLeave(true)}
                className="p-1.5 md:px-2.5 md:py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                title={t('leaveMatch')}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{t('leaveMatch')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Event Disruption Banner */}
        {round.globalEvent && (
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-pink-950/70 to-purple-950/70 border border-pink-500/30 shadow-lg flex items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-bounce">{round.globalEvent.icon}</span>
              <div>
                <span className="font-black text-pink-300 uppercase tracking-wider">{round.globalEvent.title}</span>
                <p className="text-[11px] text-neutral-300">{round.globalEvent.description}</p>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-black uppercase tracking-wider shrink-0">
              Disruption Event
            </span>
          </div>
        )}

        {/* Dynamic Timer Bar */}
        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-75 rounded-full ${
              timePct < 25 ? 'bg-rose-500 animate-pulse' : timePct < 50 ? 'bg-yellow-400' : 'bg-spotify'
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>

        {/* Real-time In-Game Player Standings Bar */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-spotify">
              <Trophy className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'อันดับสดในเกม (Live Standings)' : 'Live Match Standings'}</span>
            </span>
            <button
              onClick={() => {
                sfx.click();
                setShowLeaderboard(true);
              }}
              className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-bold transition-colors"
            >
              <span>{lang === 'th' ? 'ดูตารางเต็ม' : 'Full Table'}</span>
              <span>({room.players.length} {lang === 'th' ? 'คน' : 'players'})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {sortedPlayers.map((p, idx) => {
              const rank = idx + 1;
              const isMe = p.id === you;
              const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    sfx.click();
                    setShowLeaderboard(true);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 transition-all cursor-pointer ${
                    isMe
                      ? 'bg-spotify/20 border-spotify/50 text-white shadow-md shadow-spotify/20 ring-1 ring-spotify/40'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                  title={`${p.name}: ${p.score.toLocaleString()} pts (${p.hasAnswered ? 'ตอบแล้ว' : 'กำลังคิด'})`}
                >
                  <span className="font-mono font-black text-xs shrink-0">{rankMedal}</span>
                  <span className="text-base shrink-0">{p.avatar}</span>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold truncate max-w-[80px] ${isMe ? 'text-spotify' : 'text-white'}`}>
                        {p.name}
                      </span>
                      {p.hasAnswered ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" title="ตอบแล้ว (Answered)" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400/80 animate-ping" title="กำลังคิด... (Thinking...)" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono leading-none mt-0.5">
                      <span className="text-emerald-400 font-bold">{p.score.toLocaleString()}</span>
                      {p.streak >= 2 && (
                        <span className="text-orange-400 font-bold flex items-center">
                          🔥{p.streak}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CENTER STAGE: Visualizer, Question Prompt, Clues & Mic meter */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 text-center relative">
        {/* Countdown Overlay */}
        {room.phase === 'countdown' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl animate-fade-up">
            <span className="text-xs font-black uppercase tracking-widest text-spotify mb-2">
              {t('getReady')}
            </span>
            <div className="w-20 h-20 rounded-full bg-spotify/20 border-2 border-spotify flex items-center justify-center text-4xl font-black text-white font-mono animate-pop">
              🎧
            </div>
          </div>
        )}

        {/* Decade Radar Clue Hint if active */}
        {priv?.radar && (
          <div className="mb-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-up">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
            <span>
              {t('radarHint', {
                decade: priv.radar.decade,
                from: priv.radar.range[0],
                to: priv.radar.range[1],
              })}
            </span>
          </div>
        )}

        {/* Question Prompt */}
        <h3 className="text-xl md:text-2xl font-black text-white mb-2">
          {t(`ask_${round.ask}`)}
        </h3>

        {/* Audio Visualizer */}
        <div className="w-full max-w-sm h-36 md:h-44">
          <Visualizer isMicMode={room.settings.mode === 'mic'} isActive={room.phase === 'playing'} />
        </div>

        {/* Mic Mayhem Mode Controls & Bonus Meter */}
        {room.settings.mode === 'mic' && (
          <div className="mt-2 glass px-4 py-2 rounded-2xl flex items-center gap-3 border border-pink-500/30">
            {!micActive ? (
              <button
                onClick={handleEnableMic}
                className="btn-ghost !py-1 !px-3 text-xs font-bold text-pink-300 border-pink-400/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-pink-400" />
                <span>{t('micEnable')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
                <Mic className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>{t('humMeter')}:</span>
                <span className="font-mono font-black text-white">+{micScoreBonus} pts</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4 ANSWER CHOICES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
        {choicesOrder.map((origIdx) => {
          const rawChoiceText = round.choices[origIdx];
          const isRemoved = priv?.removed.includes(origIdx);
          const isSelected = selectedChoice === origIdx;

          if (isRemoved) {
            return (
              <div
                key={origIdx}
                className="glass rounded-2xl p-4 border border-white/5 opacity-25 flex items-center justify-between text-neutral-500 line-through select-none"
              >
                <span className="text-sm font-bold truncate">{rawChoiceText}</span>
                <span className="text-xs font-mono">50/50</span>
              </div>
            );
          }

          let choiceText = rawChoiceText;
          if (hasJumble) {
            // Obfuscate and scramble words for jumble sabotage
            choiceText = choiceText
              .split(' ')
              .map((w) => (w.length <= 3 ? w : w[0] + w.slice(1, -1).split('').reverse().join('') + w[w.length - 1]))
              .join(' ');
          }

          const displayedText = isBlackout ? '🌑 •••••••••• (Stage Blackout)' : choiceText;
          const frozenSec = priv?.frozenUntil ? Math.max(0.1, (priv.frozenUntil - client.now()) / 1000).toFixed(1) : '3.5';

          return (
            <button
              key={origIdx}
              onClick={() => handleSelectAnswer(origIdx)}
              disabled={selectedChoice !== null || room.phase !== 'playing' || isFrozen}
              className={`p-4 md:p-5 rounded-2xl border text-left font-bold transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                isFrozen
                  ? 'border-cyan-400/80 bg-cyan-950/70 text-cyan-200 opacity-70 cursor-not-allowed shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                  : hasJumble
                  ? 'border-orange-500/40 bg-orange-950/20 text-orange-200 hover:border-orange-400'
                  : isSelected
                  ? 'bg-spotify text-black border-spotify shadow-xl shadow-spotify/40 scale-101'
                  : 'glass text-white border-white/10 hover:border-spotify/50 hover:bg-white/10 active:scale-98'
              }`}
            >
              <span className="text-sm md:text-base font-extrabold truncate mr-2">
                {isFrozen ? `❄️ Frozen in ice (${frozenSec}s)...` : displayedText}
              </span>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                  isFrozen
                    ? 'bg-cyan-900 text-cyan-300'
                    : isSelected
                    ? 'bg-black text-spotify'
                    : 'bg-white/10 text-neutral-400 group-hover:text-white'
                }`}
              >
                {String.fromCharCode(65 + origIdx)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leave Game Confirmation Modal */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="glass-strong rounded-3xl max-w-sm w-full p-6 text-center border border-rose-500/40 shadow-2xl relative bg-neutral-950/95 space-y-4">
            <div className="w-12 h-12 mx-auto bg-rose-500/20 border border-rose-400 rounded-full flex items-center justify-center text-rose-400">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('leaveMatch')}</h3>
              <p className="text-xs text-neutral-300 mt-1">{t('leaveMatchConfirm')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  sfx.click();
                  music.stop();
                  client.send({ t: 'leave' });
                  setConfirmLeave(false);
                }}
                className="btn-primary py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                {t('confirm')}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="btn-ghost py-2.5 text-xs font-bold cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rematch Confirmation Modal */}
      {confirmRematch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="glass-strong rounded-3xl max-w-sm w-full p-6 text-center border border-yellow-500/40 shadow-2xl relative bg-neutral-950/95 space-y-4">
            <div className="w-12 h-12 mx-auto bg-yellow-500/20 border border-yellow-400 rounded-full flex items-center justify-center text-yellow-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('rematch')}</h3>
              <p className="text-xs text-neutral-300 mt-1">{t('rematchConfirm')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  sfx.click();
                  music.stop();
                  client.send({ t: 'rematch' });
                  setConfirmRematch(false);
                }}
                className="btn-primary py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs cursor-pointer shadow-lg shadow-yellow-500/20"
              >
                {t('confirm')}
              </button>
              <button
                onClick={() => setConfirmRematch(false)}
                className="btn-ghost py-2.5 text-xs font-bold cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TACTICAL ABILITY DOCK */}
      {room.settings.cardsEnabled && me && me.hand.length > 0 && (
        <div className="glass-strong rounded-3xl p-3 border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          {/* Mana Pool Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span className="text-xs font-black uppercase text-neutral-400">{t('mana')}</span>
            <span className="font-mono font-black text-cyan-300 text-sm">
              {me.mana}/{modeDef.maxMana}
            </span>
          </div>

          {/* Cards Tray */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {me.hand.map((slot) => {
              const card = CARDS[slot.id];
              const onCooldown = slot.cooldown > 0;
              const canAfford = me.mana >= card.cost;
              const disabled = onCooldown || !canAfford || room.phase !== 'playing';

              return (
                <button
                  key={slot.id}
                  disabled={disabled}
                  onClick={() => handleCardCastClick(slot.id)}
                  className={`px-3 py-2 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer ${
                    disabled
                      ? 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed'
                      : 'bg-white/10 border-white/20 hover:border-spotify hover:bg-white/15 active:scale-95'
                  }`}
                >
                  <div className="w-7 h-8 shrink-0">
                    <CardArt id={slot.id} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-white leading-tight">
                      {t(`card_${slot.id}`)}
                    </div>
                    <div className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                      <span className="text-cyan-400">{card.cost}M</span>
                      {onCooldown && <span className="text-rose-400">({slot.cooldown}cd)</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SABOTAGE TARGET SELECTOR MODAL */}
      {targetCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-up">
          <div className="glass-strong rounded-3xl max-w-sm w-full p-6 border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white text-center">
              {t('chooseTarget')} — {t(`card_${targetCard}`)}
            </h3>

            <div className="space-y-2">
              {/* All Rivals option */}
              <button
                onClick={() => handleConfirmSabotageTarget('all')}
                className="w-full p-3 rounded-2xl glass hover:bg-spotify/20 border border-white/10 hover:border-spotify text-left font-bold text-sm text-white flex items-center justify-between"
              >
                <span>🌐 {t('allRivals')}</span>
              </button>

              {/* Individual Rivals */}
              {room.players
                .filter((p) => p.id !== you)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleConfirmSabotageTarget(p.id)}
                    className="w-full p-3 rounded-2xl glass hover:bg-white/15 border border-white/10 text-left font-bold text-sm text-white flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{p.avatar}</span>
                      <span>{p.name}</span>
                    </span>
                    <span className="text-xs font-mono text-emerald-400">{p.score} pts</span>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setTargetCard(null)}
              className="btn-ghost w-full py-2 text-xs font-bold"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* Real-time Match Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="glass-strong rounded-3xl max-w-lg w-full p-5 md:p-6 border border-white/15 shadow-2xl relative bg-neutral-950/95 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-spotify/20 border border-spotify/40 flex items-center justify-center text-spotify shadow-inner">
                  <Trophy className="w-5 h-5 text-spotify" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{lang === 'th' ? 'อันดับคะแนน Real-time' : 'Live Match Leaderboard'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-spotify/20 text-spotify uppercase font-bold">
                      Round {round.index + 1}/{round.total}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {lang === 'th'
                      ? `คุณอยู่อันดับที่ #${myRank} จากทั้งหมด ${sortedPlayers.length} คน`
                      : `You are currently in Rank #${myRank} of ${sortedPlayers.length}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Players Table */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {sortedPlayers.map((p, idx) => {
                const rank = idx + 1;
                const isMe = p.id === you;
                const diffFromLeader = leader ? leader.score - p.score : 0;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isMe
                        ? 'bg-spotify/15 border-spotify/50 shadow-md shadow-spotify/10 ring-1 ring-spotify/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Medal */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black font-mono text-sm shrink-0">
                        {rank === 1 ? (
                          <span className="text-2xl animate-bounce">🥇</span>
                        ) : rank === 2 ? (
                          <span className="text-2xl">🥈</span>
                        ) : rank === 3 ? (
                          <span className="text-2xl">🥉</span>
                        ) : (
                          <span className="text-neutral-400 font-bold">#{rank}</span>
                        )}
                      </div>

                      {/* Avatar & Details */}
                      <div className="text-2xl shrink-0">{p.avatar}</div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-black ${isMe ? 'text-spotify' : 'text-white'}`}>
                            {p.name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-spotify text-black font-black uppercase tracking-wider">
                              {lang === 'th' ? 'คุณ' : 'YOU'}
                            </span>
                          )}
                          {p.isHost && (
                            <span title="Host">
                              <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            </span>
                          )}
                        </div>

                        {/* Status Tags */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
                          {p.hasAnswered ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'ตอบแล้ว' : 'Answered'}</span>
                            </span>
                          ) : (
                            <span className="text-amber-400/90 font-medium flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span>{lang === 'th' ? 'กำลังคิดคำตอบ...' : 'Thinking...'}</span>
                            </span>
                          )}

                          {p.streak >= 2 && (
                            <span className="text-orange-400 font-bold flex items-center gap-0.5">
                              <Flame className="w-3 h-3 fill-orange-400" />
                              <span>{p.streak}×</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score & Points Diff */}
                    <div className="text-right">
                      <div className="text-base font-mono font-black text-emerald-400">
                        {p.score.toLocaleString()} <span className="text-xs font-normal text-neutral-400">pts</span>
                      </div>
                      {rank > 1 && (
                        <div className="text-[10px] text-neutral-400 font-mono">
                          -{diffFromLeader.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="btn-primary w-full py-2.5 text-xs font-black cursor-pointer shadow-lg shadow-spotify/20"
              >
                {lang === 'th' ? 'กลับไปหน้าคำถาม' : 'Back to Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
