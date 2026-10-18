import React, { useState, useEffect } from 'react';
import { music } from '../lib/audio';
import { bgm, type BgmState } from '../lib/bgm';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/authContext';
import { visualizerSettings, type VisualizerConfig, type VisualizerThickness } from '../lib/visualizerSettings';
import {
  Volume2, VolumeX, Volume1, Radio, Disc3, ChevronDown, ChevronUp,
  Sparkles, Sliders, Play, Pause, SkipForward, SkipBack, Music2,
  Activity, ExternalLink
} from 'lucide-react';
import type { RoomState } from '../../shared/types';

interface Props {
  room: RoomState | null;
  onOpenDebug?: () => void;
}

export const MusicPlayerWidget: React.FC<Props> = ({ room, onOpenDebug }) => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isSpotifyUser = user?.provider === 'spotify';

  const [matchVol, setMatchVol] = useState(music.volume);
  const [isReduced, setIsReduced] = useState(music.isReduced);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bgmState, setBgmState] = useState<BgmState>(bgm.getState());
  const [spotifyFullTrack, setSpotifyFullTrack] = useState(() => localStorage.getItem('jq.bgm.spotify_full') === 'true');
  const [visConfig, setVisConfig] = useState<VisualizerConfig>(visualizerSettings.getConfig());

  useEffect(() => {
    return visualizerSettings.subscribe(setVisConfig);
  }, []);

  const handleToggleSpotifyFull = (enable: boolean) => {
    setSpotifyFullTrack(enable);
    localStorage.setItem('jq.bgm.spotify_full', String(enable));
    bgm.setSpotifyFullTrackMode(enable);
    if (enable) {
      bgm.pause(false);
    } else {
      bgm.play();
    }
  };

  useEffect(() => {
    const unsubMusic = music.subscribe((newVol, reduced) => {
      setMatchVol(newVol);
      setIsReduced(reduced);
    });

    const unsubBgm = bgm.subscribe((newBgmState) => {
      setBgmState({ ...newBgmState });
    });

    return () => {
      unsubMusic();
      unsubBgm();
    };
  }, []);

  // Determine whether match audio or lobby radio is the active audio source
  const isMatchPhase =
    room?.phase === 'countdown' ||
    room?.phase === 'playing' ||
    room?.phase === 'reveal' ||
    room?.phase === 'draft';

  // Synchronize BGM match active state
  useEffect(() => {
    bgm.setMatchActive(Boolean(isMatchPhase));
  }, [isMatchPhase]);

  const round = room?.round;
  const reveal = room?.reveal;
  const track = reveal?.track;

  // Active track info
  const title = isMatchPhase
    ? (track?.title || (round ? `${t('round')} ${round.index + 1}` : 'Jam!Quiz Duel'))
    : (bgmState.currentTrack?.title || 'Jam!Quiz Radio');

  const artist = isMatchPhase
    ? (track?.artist || (room?.settings.genre ? `${room.settings.genre.toUpperCase()} Trivia` : 'Music Trivia Duel'))
    : (bgmState.currentTrack?.artist || 'Developer Curated Hits');

  const artwork = isMatchPhase
    ? track?.artwork
    : bgmState.currentTrack?.artwork || bgmState.cover;

  const currentVol = isMatchPhase ? matchVol : (bgmState.isMuted ? 0 : bgmState.volume);

  const currentSpotifyId =
    bgmState.currentTrack?.spotifyId ||
    (bgmState.currentTrack?.spotifyUri?.startsWith('spotify:track:')
      ? bgmState.currentTrack.spotifyUri.split(':')[2]
      : bgmState.currentTrack?.id?.startsWith('sp-')
      ? bgmState.currentTrack.id.split('-')[1]
      : undefined);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (isMatchPhase) {
      music.setVolume(v);
    } else {
      bgm.setVolume(v);
    }
  };

  const handleToggleMute = () => {
    if (isMatchPhase) {
      music.setVolume(matchVol > 0 ? 0 : 0.8);
    } else {
      bgm.toggleMute();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      {isExpanded ? (
        /* EXPANDED PLAYER DECK */
        <div className="glass-strong rounded-3xl p-4 border border-white/15 shadow-2xl w-84 animate-fade-up bg-neutral-950/95 backdrop-blur-2xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isMatchPhase ? 'bg-amber-400' : 'bg-spotify'} animate-ping`} />
              <span className="text-xs font-black uppercase tracking-wider text-spotify flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-spotify" />
                <span>{isMatchPhase ? 'Match Audio Engine' : 'Jam!Quiz Radio'}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenDebug && (
                <button
                  onClick={onOpenDebug}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-spotify transition-colors"
                  title="Open Debug Command Center"
                >
                  DEBUG
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize player"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Track Details & Album Art */}
          <div className="flex items-center gap-3.5 my-3.5">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-xl group">
              {artwork ? (
                <img
                  src={artwork}
                  alt="Album Art"
                  className={`w-full h-full object-cover transition-transform ${bgmState.isPlaying || isMatchPhase ? 'scale-105' : 'opacity-85'}`}
                />
              ) : (
                <Disc3 className={`w-8 h-8 text-spotify ${(bgmState.isPlaying || isMatchPhase) ? 'animate-spin-slow' : ''}`} />
              )}
              {/* Sound Bars Overlay */}
              {(bgmState.isPlaying || isMatchPhase) && (
                <div className="absolute inset-0 bg-black/35 flex items-end justify-center gap-0.5 p-1.5 backdrop-blur-[1px]">
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-2" />
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-4 delay-75" />
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-2.5 delay-150" />
                  <span className="w-1 bg-spotify rounded-full animate-bounce h-3 delay-100" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-white truncate">{title}</h4>
              <p className="text-xs text-neutral-300 truncate">{artist}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-spotify/20 text-spotify uppercase tracking-wide">
                  {isMatchPhase ? 'Live Duel Match' : bgmState.playlistName}
                </span>
              </div>
            </div>
          </div>

          {/* Radio Transport Controls (when in Lobby / Home) */}
          {!isMatchPhase && (
            <div className="flex items-center justify-center gap-3 py-1 mb-2 bg-white/5 rounded-2xl border border-white/5">
              <button
                onClick={() => bgm.prev()}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => bgm.togglePlay()}
                className="p-2.5 rounded-full bg-spotify text-black font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-spotify/30"
                title={bgmState.isPlaying ? 'Pause BGM' : 'Play BGM'}
              >
                {bgmState.isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
              </button>
              <button
                onClick={() => bgm.next()}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Spotify Full Track Mode (for Spotify Logged-in Users) */}
          {!isMatchPhase && isSpotifyUser && (
            <div className="my-2.5 p-2.5 rounded-2xl bg-spotify/10 border border-spotify/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-spotify animate-pulse" />
                  <span className="text-[11px] font-black text-spotify uppercase tracking-wider">
                    {lang === 'th' ? 'Spotify เล่นเต็มเพลง' : 'Spotify Full Track'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleSpotifyFull(!spotifyFullTrack)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    spotifyFullTrack
                      ? 'bg-spotify text-black border-spotify shadow-sm font-black'
                      : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  {spotifyFullTrack ? (lang === 'th' ? 'เปิดอยู่ (ON)' : 'Full (ON)') : (lang === 'th' ? '30s Preview' : '30s Preview')}
                </button>
              </div>

              {spotifyFullTrack && currentSpotifyId && (
                <div className="animate-fade-up space-y-1.5">
                  <div className="rounded-xl overflow-hidden border border-spotify/30 shadow-inner bg-black/40">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${currentSpotifyId}?utm_source=generator&theme=0`}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-xl"
                      title="Spotify Full Track Player"
                    />
                  </div>
                  <div className="flex items-center justify-between px-1 text-[10px] text-neutral-400">
                    <span>{lang === 'th' ? 'เล่นเต็มเพลงผ่าน Spotify' : 'Full playback via Spotify'}</span>
                    <a
                      href={`https://open.spotify.com/track/${currentSpotifyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-spotify hover:underline inline-flex items-center gap-0.5 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{lang === 'th' ? 'เปิดใน App' : 'Open App'}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Volume Control Slider */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleMute}
                  className="hover:text-white transition-colors cursor-pointer"
                  title={currentVol === 0 ? 'Unmute' : 'Mute'}
                >
                  {currentVol === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : currentVol < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-spotify" />
                  )}
                </button>
                <span>{isMatchPhase ? 'Duel Volume' : 'Radio Volume'}</span>
              </div>
              <span className="font-mono text-neutral-400">{Math.round(currentVol * 100)}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentVol}
              onChange={handleVolumeChange}
              className="w-full accent-spotify h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              {isMatchPhase ? (
                <button
                  onClick={() => music.toggleReduction()}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    isReduced
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-inner'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                  }`}
                  title="Reduces music volume for voice chat"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isReduced ? 'Quiet Mode (ON)' : 'Quiet Mode (-50%)'}</span>
                </button>
              ) : (
                <div className="flex-1 text-[11px] text-neutral-400 truncate">
                  <span>Track {bgmState.currentIndex + 1} of {bgmState.tracks.length}</span>
                </div>
              )}

              <button
                onClick={handleToggleMute}
                className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 cursor-pointer"
              >
                {currentVol === 0 ? 'Unmute' : 'Mute'}
              </button>
            </div>

            {/* Visualizer Settings inside Player Deck */}
            {!isMatchPhase && (
              <div className="pt-2.5 mt-2.5 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-spotify" />
                    <span>Audio Visualizer Effect</span>
                  </span>
                  <button
                    onClick={() => visualizerSettings.setEnabled(!visConfig.enabled)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      visConfig.enabled
                        ? 'bg-spotify/20 text-spotify border-spotify/40 shadow-sm'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {visConfig.enabled ? (lang === 'th' ? 'เปิด' : 'ON') : (lang === 'th' ? 'ปิด' : 'OFF')}
                  </button>
                </div>

                {visConfig.enabled && (
                  <div className="space-y-1.5 animate-fade-up">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>{lang === 'th' ? 'ความหนา Effect ตามเพลง' : 'Effect Intensity'}</span>
                      <span className="font-mono text-spotify font-bold">{visConfig.thickness.toFixed(1)}x</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {(['thin', 'medium', 'thick', 'mega'] as VisualizerThickness[]).map((preset) => {
                        const labels: Record<VisualizerThickness, { th: string; en: string }> = {
                          thin: { th: 'เบา', en: 'Thin' },
                          medium: { th: 'กลาง', en: 'Med' },
                          thick: { th: 'หนา', en: 'Thick' },
                          mega: { th: 'จัดเต็ม', en: 'Mega' },
                        };
                        const isSelected = visConfig.preset === preset;
                        return (
                          <button
                            key={preset}
                            onClick={() => visualizerSettings.setPreset(preset)}
                            className={`py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-spotify text-black border-spotify shadow-sm font-black'
                                : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {lang === 'th' ? labels[preset].th : labels[preset].en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MINIMIZED FLOATING PILL WIDGET */
        <div
          onClick={() => setIsExpanded(true)}
          className="glass-strong rounded-full pl-2 pr-3.5 py-1.5 border border-white/15 shadow-2xl flex items-center gap-2.5 cursor-pointer hover:border-spotify/50 hover:bg-neutral-900/95 transition-all duration-200 group bg-neutral-950/90 backdrop-blur-lg"
        >
          {/* Cover Art Thumbnail or Animated Disc */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-spotify/20 border border-spotify/40 flex items-center justify-center text-spotify shrink-0">
            {artwork ? (
              <img
                src={artwork}
                alt="Art"
                className={`w-full h-full object-cover ${(bgmState.isPlaying || isMatchPhase) ? 'animate-spin-slow' : ''}`}
              />
            ) : (
              <Disc3 className={`w-4 h-4 ${(bgmState.isPlaying || isMatchPhase) ? 'animate-spin-slow' : ''}`} />
            )}
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white max-w-[130px] truncate leading-tight">
                {title}
              </span>
              {!isMatchPhase && (
                <span className="text-[9px] bg-spotify/20 text-spotify px-1 py-0.2 rounded font-bold uppercase">
                  Radio
                </span>
              )}
              {isReduced && (
                <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1 rounded font-bold">
                  -50%
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 truncate max-w-[130px]">
              {artist}
            </span>
          </div>

          {/* Equalizer Visualizer Bars */}
          {(bgmState.isPlaying || isMatchPhase) && (
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
