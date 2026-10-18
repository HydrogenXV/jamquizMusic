import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { music } from '../lib/audio';
import { client } from '../lib/net';
import { CARD_IDS, CARDS, GENRES, MODE_IDS, MODES } from '../../shared/game';
import type { AskType, CardId, GenreId, ModeId, QuestionType, RoomState } from '../../shared/types';
import {
  Copy, Check, Bot, UserX, Crown, Play, LogOut, Settings, Music,
  Sparkles, Layers, Sliders, Link, ChevronRight, Lock
} from 'lucide-react';

interface Props {
  room: RoomState;
  you: string | null;
}

const FEATURED_PRESETS = [
  { id: '37i9dQZF1DXcBWIGoYBM5M', title: "Today's Top Hits", subtitle: '50 Chart Toppers', icon: '🌟' },
  { id: '37i9dQZEVXbMDoHDwVN2tF', title: 'Global Top 50', subtitle: 'Global Viral Hits', icon: '🌍' },
  { id: '37i9dQZF1DWXRqgorJj26U', title: 'Rock Classics', subtitle: '100 Legendary Rock', icon: '🎸' },
  { id: '37i9dQZF1DX4UtSsGT1Sbe', title: 'All Out 80s', subtitle: '80s Synth & Pop', icon: '🕺' },
  { id: '37i9dQZF1DX4o1oenSJRJd', title: 'All Out 2000s', subtitle: '2000s Hits', icon: '💿' },
  { id: '37i9dQZF1DX9tPFwDMOaN1', title: 'K-Pop ON!', subtitle: 'Hot Korean Pop', icon: '🇰🇷' },
  { id: '37i9dQZF1DX4dyzvuaRJ0n', title: 'mint EDM Hits', subtitle: 'Club & Festival', icon: '🎧' },
  { id: '37i9dQZF1DXbYM3nMM0oPk', title: 'Mega Hit Mix', subtitle: '75 Massive Hits', icon: '🔥' },
];

export const LobbyView: React.FC<Props> = ({ room, you }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Ensure any match audio is halted when in lobby
  useEffect(() => {
    music.stop();
  }, []);

  const me = room.players.find((p) => p.id === you);
  const isHost =
    (room.hostId && you && room.hostId === you) ||
    (me?.isHost ?? false) ||
    (room.players.filter((p) => !p.isBot).length <= 1);
  const settings = room.settings;

  const selectedGenres: GenreId[] =
    settings.genres && settings.genres.length > 0
      ? settings.genres
      : [settings.genre || 'pop'];

  const toggleGenre = (gId: GenreId) => {
    if (!isHost) return;
    sfx.click();
    if (room.playlist) {
      client.send({ t: 'clearPlaylist' });
    }
    let next: GenreId[];
    if (selectedGenres.includes(gId)) {
      if (selectedGenres.length === 1) return; // keep at least 1 selected
      next = selectedGenres.filter((x) => x !== gId);
    } else {
      next = [...selectedGenres, gId];
    }
    handleSettingChange({ genres: next, genre: next[0] });
  };

  const handleSelectAllGenres = () => {
    if (!isHost) return;
    sfx.click();
    if (room.playlist) {
      client.send({ t: 'clearPlaylist' });
    }
    if (selectedGenres.length === GENRES.length) {
      handleSettingChange({ genres: ['pop'], genre: 'pop' });
    } else {
      const all = GENRES.map((g) => g.id as GenreId);
      handleSettingChange({ genres: all, genre: all[0] });
    }
  };

  const selectedQuestionTypes: AskType[] =
    settings.questionTypes && settings.questionTypes.length > 0
      ? settings.questionTypes
      : settings.questionType === 'mixed'
      ? ['title', 'artist', 'year']
      : [settings.questionType as AskType];

  const toggleQuestionType = (qt: AskType) => {
    if (!isHost || settings.mode === 'decade') return;
    sfx.click();
    let next: AskType[];
    if (selectedQuestionTypes.includes(qt)) {
      if (selectedQuestionTypes.length === 1) return; // Keep at least 1 selected
      next = selectedQuestionTypes.filter((x) => x !== qt);
    } else {
      next = [...selectedQuestionTypes, qt];
    }
    handleSettingChange({
      questionTypes: next,
      questionType: next.length === 3 ? 'mixed' : (next[0] as QuestionType),
    });
  };

  const selectAllQuestionTypes = () => {
    if (!isHost || settings.mode === 'decade') return;
    sfx.click();
    if (selectedQuestionTypes.length === 3) {
      handleSettingChange({ questionTypes: ['title'], questionType: 'title' });
    } else {
      handleSettingChange({ questionTypes: ['title', 'artist', 'year'], questionType: 'mixed' });
    }
  };

  const copyRoomCode = () => {
    sfx.click();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettingChange = (patch: any) => {
    if (!isHost) return;
    sfx.click();
    client.send({ t: 'settings', patch });
  };

  const handleAddBot = () => {
    sfx.click();
    client.send({ t: 'addBot' });
  };

  const handleKick = (id: string) => {
    sfx.click();
    client.send({ t: 'kick', id });
  };

  const handleStart = () => {
    sfx.click();
    client.send({ t: 'start' });
  };

  const handleLeave = () => {
    sfx.click();
    client.send({ t: 'leave' });
  };

  const handleImportSpotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifyUrl.trim() || !isHost) return;
    sfx.click();
    setImporting(true);
    client.send({ t: 'importPlaylist', url: spotifyUrl.trim() });
    setTimeout(() => setImporting(false), 2000);
  };

  const toggleCardDisabled = (cId: CardId) => {
    if (!isHost) return;
    sfx.click();
    const curr = settings.disabledCards || [];
    const next = curr.includes(cId) ? curr.filter((x) => x !== cId) : [...curr, cId];
    handleSettingChange({ disabledCards: next });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-up">
      {/* Top Banner: Room Code & Action buttons */}
      <div className="glass-strong rounded-3xl p-5 md:p-6 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-spotify/20 border border-spotify/30 flex items-center justify-center text-3xl shadow-inner">
            🎧
          </div>
          <div>
            <div className="text-xs uppercase font-black tracking-wider text-neutral-400">
              {t('roomCode')}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl font-mono font-black text-white tracking-wider">
                {room.code}
              </span>
              <button
                onClick={copyRoomCode}
                className="btn-ghost !py-1 !px-3 text-xs font-bold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-spotify" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied') : t('copy')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('leaveRoom')}</span>
          </button>

          {isHost ? (
            <button
              onClick={handleStart}
              className="btn-primary py-3 px-6 text-sm font-black shadow-lg shadow-spotify/30 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{t('startMatch')}</span>
            </button>
          ) : (
            <div className="glass px-4 py-2.5 rounded-full text-xs font-bold text-neutral-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-spotify animate-ping" />
              <span>{t('waitingHost')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Roster & Spotify Importer | Right Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player Roster & Playlist details */}
        <div className="lg:col-span-5 space-y-6">
          {/* Players Roster */}
          <div className="glass rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{t('players')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  {room.players.length}/8
                </span>
              </h3>

              {isHost && room.players.length < 8 && (
                <button
                  onClick={handleAddBot}
                  className="btn-ghost !py-1 !px-3 text-xs font-bold flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{t('addBot')}</span>
                </button>
              )}
            </div>

            {room.players.length === 1 && (
              <p className="text-xs text-neutral-400 italic bg-white/5 p-2.5 rounded-xl border border-white/5">
                💡 {t('soloHint')}
              </p>
            )}

            <div className="space-y-2">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                    p.id === you
                      ? 'bg-spotify/10 border-spotify/30 ring-1 ring-spotify/20'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.avatar}</span>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.id === you && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-spotify/20 text-spotify font-black uppercase">
                            {t('you')}
                          </span>
                        )}
                        {p.isHost && (
                          <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        )}
                        {p.isBot && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                            {t('bot')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isHost && p.id !== you && (
                    <button
                      onClick={() => handleKick(p.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                      title={t('kick')}
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Spotify Playlist Importer */}
          <div className="glass rounded-3xl p-5 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-spotify" />
              <h3 className="text-sm font-black text-white">{t('spotifyImport')}</h3>
            </div>

            {room.playlist && (
              <div className="p-3 rounded-xl bg-spotify/10 border border-spotify/20 flex items-center gap-3">
                {room.playlist.cover ? (
                  <img src={room.playlist.cover} alt="Cover" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-spotify/20 flex items-center justify-center text-xl">🎵</div>
                )}
                <div className="flex-1 truncate">
                  <div className="text-xs font-black text-white truncate">{room.playlist.name}</div>
                  <div className="text-[11px] text-spotify font-bold">{room.playlist.count} {t('tracks')}</div>
                </div>
              </div>
            )}

            {isHost ? (
              <form onSubmit={handleImportSpotify} className="space-y-2">
                <input
                  type="text"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder={t('spotifyPlaceholder')}
                  className="input-field text-xs"
                />
                <button
                  type="submit"
                  disabled={!spotifyUrl.trim() || importing}
                  className="btn-ghost w-full py-2 text-xs font-bold text-spotify border-spotify/30 hover:border-spotify flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{importing ? t('importing') : t('import')}</span>
                </button>
              </form>
            ) : (
              <p className="text-xs text-neutral-500 italic">{t('hostOnly')}</p>
            )}

            {/* Featured Hits Quick Presets */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-spotify" />
                  <span>Featured Hits</span>
                </span>
                <span className="text-[10px] text-spotify font-bold">1-Click Load</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {FEATURED_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isHost || importing}
                    onClick={() => {
                      if (!isHost) return;
                      sfx.click();
                      setImporting(true);
                      const targetUrl = `https://open.spotify.com/playlist/${p.id}`;
                      setSpotifyUrl(targetUrl);
                      client.send({ t: 'importPlaylist', url: targetUrl });
                      setTimeout(() => setImporting(false), 2500);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-spotify/20 hover:border-spotify/40 border border-white/5 text-left transition-all flex items-center gap-2 group cursor-pointer disabled:opacity-40"
                    title={`Load ${p.title}`}
                  >
                    <span className="text-sm shrink-0">{p.icon}</span>
                    <div className="truncate">
                      <div className="text-[11px] font-bold text-neutral-200 group-hover:text-spotify truncate">{p.title}</div>
                      <div className="text-[9px] text-neutral-400 truncate">{p.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Host Match Settings Controls */}
        <div className="lg:col-span-7 glass rounded-3xl p-5 md:p-6 border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-spotify" />
              <span>{t('settings')}</span>
            </h3>
            {!isHost && (
              <span className="text-xs text-neutral-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full">
                <Lock className="w-3 h-3" />
                {t('hostOnly')}
              </span>
            )}
          </div>

          {/* 1. Game Mode Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-2">
              {t('mode')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODE_IDS.map((mId) => {
                const def = MODES[mId];
                const active = settings.mode === mId;
                return (
                  <button
                    key={mId}
                    disabled={!isHost}
                    onClick={() => handleSettingChange({ mode: mId, rounds: MODES[mId].defaultRounds })}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      active
                        ? 'border-spotify bg-spotify/15 shadow-lg shadow-spotify/20 ring-1 ring-spotify/30'
                        : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{def.icon}</span>
                        <span>{t(`mode_${mId}`)}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Music Source: Spotify Playlist Override OR Multi-Topic Genres */}
          {room.playlist ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-spotify/15 to-emerald-950/30 border border-spotify/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-spotify font-black text-xs uppercase tracking-wider">
                  <Music className="w-4 h-4" />
                  <span>Spotify Music Source Active</span>
                </div>
                <span className="text-[10px] bg-spotify/20 text-spotify px-2 py-0.5 rounded-full font-mono font-bold">
                  Bypassing Genre Selection
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 truncate">
                  {room.playlist.cover ? (
                    <img src={room.playlist.cover} alt="Cover" className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-md" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-spotify/30 flex items-center justify-center text-xl shrink-0">🎧</div>
                  )}
                  <div className="truncate">
                    <p className="text-sm font-black text-white truncate">{room.playlist.name}</p>
                    <p className="text-xs text-spotify font-medium">{room.playlist.count} tracks loaded</p>
                  </div>
                </div>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      sfx.click();
                      client.send({ t: 'clearPlaylist' });
                    }}
                    className="btn-ghost shrink-0 py-1.5 px-3 text-xs font-bold text-red-300 border-red-500/30 hover:border-red-500 hover:text-red-200 cursor-pointer"
                  >
                    Clear & Use Genres
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                Trivia tracks are directly supplied by your imported Spotify playlist. Multi-genre selection is skipped.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <span>{t('genre')} (Multi-Topic)</span>
                  <span className="text-[10px] bg-spotify/20 text-spotify px-2 py-0.5 rounded-full font-mono font-bold">
                    {selectedGenres.length} {t('selected') || 'Selected'}
                  </span>
                </label>
                {isHost && (
                  <button
                    type="button"
                    onClick={handleSelectAllGenres}
                    className="text-xs font-bold text-spotify hover:text-spotify/80 hover:underline cursor-pointer"
                  >
                    {selectedGenres.length === GENRES.length ? 'Reset to Default' : 'Select All Topics'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GENRES.map((g) => {
                  const active = selectedGenres.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      disabled={!isHost}
                      onClick={() => toggleGenre(g.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                        active
                          ? 'border-spotify bg-spotify/25 text-white shadow-lg shadow-spotify/20 ring-1 ring-spotify/40 scale-[1.02]'
                          : 'border-white/5 bg-white/5 text-neutral-400 hover:border-white/10 hover:text-neutral-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{g.icon}</span>
                        <span className="truncate">{t(`genre_${g.id}`)}</span>
                      </span>
                      {active && <span className="w-2 h-2 rounded-full bg-spotify shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Multi-Topic Question Type Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <span>{t('questionType')} (Multi-Topic)</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {settings.mode === 'decade'
                    ? 'Decade (Year Only)'
                    : `${selectedQuestionTypes.length} ${t('selected') || 'Selected'}`}
                </span>
              </label>
              {isHost && settings.mode !== 'decade' && (
                <button
                  type="button"
                  onClick={selectAllQuestionTypes}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                >
                  {selectedQuestionTypes.length === 3 ? 'Reset to Song Title' : 'Select All (Mixed)'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'title' as AskType, icon: '🎵', label: t('qt_title') || 'Song Title' },
                { id: 'artist' as AskType, icon: '🎤', label: t('qt_artist') || 'Singer / Artist' },
                { id: 'year' as AskType, icon: '📅', label: t('qt_year') || 'Release Year' },
              ].map((qt) => {
                const active = settings.mode === 'decade' ? qt.id === 'year' : selectedQuestionTypes.includes(qt.id);
                return (
                  <button
                    key={qt.id}
                    disabled={!isHost || settings.mode === 'decade'}
                    onClick={() => toggleQuestionType(qt.id)}
                    className={`p-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                        : 'border-white/5 bg-white/5 text-neutral-400 hover:border-white/10 hover:text-neutral-200'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-base">{qt.icon}</span>
                      <span className="truncate">{qt.label}</span>
                    </span>
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Rounds & Time Limit Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rounds */}
            <div className="glass p-3.5 rounded-2xl space-y-2 border border-white/5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-400">{t('rounds')}</span>
                <span className="text-spotify font-mono text-sm">{settings.rounds}</span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                value={settings.rounds}
                disabled={!isHost}
                onChange={(e) => handleSettingChange({ rounds: Number(e.target.value) })}
                className="w-full"
                style={{ '--pct': `${((settings.rounds - 3) / 27) * 100}%` } as any}
              />
            </div>

            {/* Time limit */}
            <div className="glass p-3.5 rounded-2xl space-y-2 border border-white/5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-400">{t('timeLimit')}</span>
                <span className="text-spotify font-mono text-sm">
                  {settings.mode === 'blitz' ? '3s (Blitz)' : `${settings.timeLimit}s`}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={settings.timeLimit}
                disabled={!isHost || settings.mode === 'blitz'}
                onChange={(e) => handleSettingChange({ timeLimit: Number(e.target.value) })}
                className="w-full"
                style={{ '--pct': `${((settings.timeLimit - 5) / 55) * 100}%` } as any}
              />
            </div>
          </div>

          {/* 5. Ability Cards Pool Config */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>{t('cardPool')}</span>
              </label>

              {isHost && (
                <button
                  onClick={() => handleSettingChange({ cardsEnabled: !settings.cardsEnabled })}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                    settings.cardsEnabled ? 'bg-spotify text-black' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {settings.cardsEnabled ? 'Enabled' : 'Disabled'}
                </button>
              )}
            </div>

            {settings.cardsEnabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CARD_IDS.map((cId) => {
                  const card = CARDS[cId];
                  const isDisabled = settings.disabledCards?.includes(cId);

                  return (
                    <button
                      key={cId}
                      disabled={!isHost}
                      onClick={() => toggleCardDisabled(cId)}
                      className={`p-2 rounded-xl text-left border text-xs font-bold transition-all flex items-center justify-between ${
                        isDisabled
                          ? 'border-white/5 bg-white/2 text-neutral-500 line-through'
                          : 'border-white/10 bg-white/5 text-neutral-200 hover:border-white/20'
                      }`}
                    >
                      <span className="truncate">{t(`card_${cId}`)}</span>
                      <span className="text-[10px] text-cyan-400 ml-1">{card.cost}M</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
