import React, { useState, useEffect } from 'react';
import { music } from '../lib/audio';
import { useI18n } from '../lib/i18n';
import { Volume2, VolumeX, Volume1, Radio, Disc3, ChevronDown, ChevronUp, Sparkles, Sliders } from 'lucide-react';
import type { RoomState } from '../../shared/types';

interface Props {
  room: RoomState | null;
}

export const MusicPlayerWidget: React.FC<Props> = ({ room }) => {
  const { t } = useI18n();
  const [vol, setVol] = useState(music.volume);
  const [isReduced, setIsReduced] = useState(music.isReduced);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(music.isPlaying);

  useEffect(() => {
    const unsub = music.subscribe((newVol, reduced) => {
      setVol(newVol);
      setIsReduced(reduced);
    });

    const poll = setInterval(() => {
      setIsPlaying(music.isPlaying);
    }, 250);

    return () => {
      unsub();
      clearInterval(poll);
    };
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    music.setVolume(v);
  };

  const handleToggleMute = () => {
    if (vol > 0) {
      music.setVolume(0);
    } else {
      music.setVolume(0.8);
    }
  };

  const handleToggleReduction = () => {
    music.toggleReduction();
  };

  // Determine current display info
  const round = room?.round;
  const reveal = room?.reveal;
  const track = reveal?.track;
  const isPlayingActive = room?.phase === 'playing' || room?.phase === 'countdown' || room?.phase === 'reveal';

  const title = track?.title || (round ? `${t('round')} ${round.index + 1}` : 'SpotiQuiz Radio');
  const artist = track?.artist || (room?.settings.genre ? `${room.settings.genre.toUpperCase()} Trivia` : 'Music Trivia Duel');

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      {isExpanded ? (
        /* EXPANDED PLAYER DECK */
        <div className="glass-strong rounded-3xl p-4 border border-white/15 shadow-2xl w-80 animate-fade-up bg-neutral-950/90 backdrop-blur-xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-spotify animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-spotify">
                SpotiPlayer
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Minimize player"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Track Details & Animated Disc */}
          <div className="flex items-center gap-3 my-3">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {track?.artwork ? (
                <img src={track.artwork} alt="Art" className="w-full h-full object-cover" />
              ) : (
                <Disc3 className={`w-7 h-7 text-spotify ${isPlayingActive ? 'animate-spin-slow' : ''}`} />
              )}
              {/* Sound Bars Overlay */}
              {isPlayingActive && (
                <div className="absolute inset-x-1 bottom-1 flex items-end justify-center gap-0.5 h-3">
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-2" />
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-3 delay-75" />
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-1.5 delay-150" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-white truncate">{title}</h4>
              <p className="text-[11px] text-neutral-400 truncate">{artist}</p>
              <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-spotify uppercase tracking-wide">
                {music.usingSynth ? 'Synthesizer Engine' : 'Audio Stream'}
              </span>
            </div>
          </div>

          {/* Volume Control Slider */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleMute}
                  className="hover:text-white transition-colors"
                  title={vol === 0 ? 'Unmute' : 'Mute'}
                >
                  {vol === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : vol < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-spotify" />
                  )}
                </button>
                <span>Volume</span>
              </div>
              <span className="font-mono text-neutral-400">{Math.round(vol * 100)}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={vol}
              onChange={handleVolumeChange}
              className="w-full accent-spotify h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />

            {/* Quick Reduction Button (-50% Quiet Mode) */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleToggleReduction}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  isReduced
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-inner'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                }`}
                title="Reduces music volume so you can focus or hear voice chat"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isReduced ? 'Quiet Mode (ON)' : 'Quiet Mode (-50%)'}</span>
              </button>

              <button
                onClick={() => music.setVolume(vol === 0 ? 0.8 : 0)}
                className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10"
              >
                {vol === 0 ? 'Unmute' : 'Mute'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MINIMIZED FLOATING PILL WIDGET */
        <div
          onClick={() => setIsExpanded(true)}
          className="glass-strong rounded-full pl-3 pr-3.5 py-2 border border-white/15 shadow-2xl flex items-center gap-2.5 cursor-pointer hover:border-spotify/50 hover:bg-neutral-900/90 transition-all duration-200 group bg-neutral-950/80 backdrop-blur-md"
        >
          {/* Animated Disc / Waves */}
          <div className="relative w-7 h-7 rounded-full bg-spotify/20 border border-spotify/40 flex items-center justify-center text-spotify shrink-0">
            <Disc3 className={`w-4 h-4 ${isPlayingActive ? 'animate-spin-slow' : ''}`} />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white max-w-[120px] truncate leading-tight">
                {title}
              </span>
              {isReduced && (
                <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1 rounded font-bold">
                  -50%
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              Vol: {Math.round(vol * 100)}%
            </span>
          </div>

          {/* Equalizer Visualizer Bars */}
          {isPlayingActive && (
            <div className="flex items-end gap-0.5 h-3.5 ml-1">
              <span className="w-0.5 bg-spotify rounded-full animate-bounce h-2" />
              <span className="w-0.5 bg-spotify rounded-full animate-bounce h-3.5 delay-75" />
              <span className="w-0.5 bg-spotify rounded-full animate-bounce h-1.5 delay-150" />
            </div>
          )}

          <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        </div>
      )}
    </div>
  );
};
