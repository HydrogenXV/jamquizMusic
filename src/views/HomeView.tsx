import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { client } from '../lib/net';
import { useAuth } from '../lib/authContext';
import { AVATARS, MODE_IDS, MODES } from '../../shared/game';
import { Play, LogIn, Sparkles, Music, Mic, Zap, Shield, Clock, CheckCircle2 } from 'lucide-react';
import type { ModeId } from '../../shared/types';
import { AmbientVisualizer } from '../components/AmbientVisualizer';

interface Props {
  onOpenCompendium: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
}

export const HomeView: React.FC<Props> = ({ onOpenCompendium, onOpenLeaderboard, onOpenAuth }) => {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [name, setName] = useState(() => localStorage.getItem('sq.name') || '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('sq.avatar') || '🎧');
  const [joinCode, setJoinCode] = useState('');
  const [activeModeInfo, setActiveModeInfo] = useState<ModeId>('classic');

  // Synchronize name if user logs in
  useEffect(() => {
    if (user?.displayName) {
      setName(user.displayName.slice(0, 18));
      localStorage.setItem('sq.name', user.displayName.slice(0, 18));
    }
  }, [user]);

  const handleAvatarSelect = (a: string) => {
    sfx.click();
    setAvatar(a);
    localStorage.setItem('sq.avatar', a);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    localStorage.setItem('sq.name', val);
  };

  const handleCreateRoom = (modeOverride?: ModeId) => {
    sfx.click();
    const finalName = name.trim() || 'Player';
    const chosenMode = modeOverride || activeModeInfo;
    client.send({ t: 'create', name: finalName, avatar, mode: chosenMode });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sfx.click();
    const finalName = name.trim() || 'Player';
    client.send({ t: 'join', code: joinCode.trim(), name: finalName, avatar });
  };

  return (
    <>
      {/* Fullscreen Falling Stars Audio Visualizer */}
      <AmbientVisualizer />

      <div className="relative z-10 min-h-[calc(100vh-65px)] flex flex-col justify-between p-4 md:p-8 max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center my-6 md:my-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-spotify/15 border border-spotify/30 text-spotify text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            {t('tagline')}
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
            {t('heroTitle1')} <br className="hidden sm:inline" />
            <span className="text-gradient">{t('heroTitle2')}</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-neutral-400 max-w-2xl mx-auto font-medium">
            {t('heroSub')}
          </p>
        </div>

      {/* Main Action Hub: Left (Profile & Join) + Right (Game Modes Showcase) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-4">
        {/* Profile & Lobby Launcher Panel */}
        <div className="lg:col-span-5 glass-strong rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl space-y-6">
          {/* Avatar & Name Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-400">
                {t('yourName')}
              </label>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    onOpenAuth();
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="capitalize">{user.provider}</span>: {user.displayName}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    onOpenAuth();
                  }}
                  className="text-[11px] font-bold text-spotify hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{lang === 'th' ? '⚡ ล็อกอิน Google/Spotify' : '⚡ Login Google/Spotify'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-3xl flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  avatar
                )}
              </div>
              <input
                type="text"
                maxLength={18}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="input-field text-base font-bold"
              />
            </div>
          </div>

          {/* Avatar Selector Grid */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-2">
              {t('chooseAvatar')}
            </label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => handleAvatarSelect(av)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                    avatar === av
                      ? 'bg-spotify text-black scale-110 shadow-lg shadow-spotify/40 ring-2 ring-white/50'
                      : 'bg-white/5 hover:bg-white/10 hover:scale-105'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-2">
            <button
              onClick={() => handleCreateRoom()}
              className="btn-primary w-full py-4 text-base font-black shadow-lg shadow-spotify/25 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" />
              <span>{t('createRoom')} ({MODES[activeModeInfo]?.icon} {t(`mode_${activeModeInfo}`)})</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-ink-2 px-3 text-xs font-bold text-neutral-500 uppercase">
                {t('or')}
              </span>
            </div>

            {/* Join with Code */}
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('roomCodePlaceholder')}
                className="input-field font-mono font-bold tracking-widest text-center uppercase"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="btn-ghost shrink-0 px-5 font-bold flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('join')}</span>
              </button>
            </form>
          </div>
        </div>

        {/* 6 Distinct Game Modes Showcase Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-spotify" />
              {t('chooseMode')}
            </h2>
            <span className="text-xs font-bold text-neutral-400">Click to enter or customize</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODE_IDS.map((modeId) => {
              const def = MODES[modeId];
              const isSelected = activeModeInfo === modeId;

              return (
                <div
                  key={modeId}
                  onClick={() => {
                    sfx.click();
                    setActiveModeInfo(modeId);
                  }}
                  onDoubleClick={() => handleCreateRoom(modeId)}
                  className={`glass rounded-2xl p-4 cursor-pointer transition-all duration-200 border text-left group flex flex-col justify-between ${
                    isSelected
                      ? 'border-spotify bg-white/10 ring-2 ring-spotify/30 shadow-xl'
                      : 'border-white/5 hover:border-white/15 hover:bg-white/7'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{def.icon}</span>
                      <span
                        style={{ color: def.accent }}
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5"
                      >
                        {modeId === 'blitz'
                          ? '⚡ 3s Speed'
                          : modeId === 'mic'
                          ? '🎤 Mic Mode'
                          : modeId === 'mayhem'
                          ? '🃏 High Mana'
                          : modeId === 'decade'
                          ? '🕰️ Eras'
                          : modeId === 'event'
                          ? '🎪 Special Event'
                          : '🎧 Classic'}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white group-hover:text-spotify transition-colors">
                      {t(`mode_${modeId}`)}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {t(`mode_${modeId}_desc`)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateRoom(modeId);
                    }}
                    className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-spotify text-black shadow-lg shadow-spotify/25 hover:scale-[1.02]'
                        : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    <Play className={`w-3.5 h-3.5 ${isSelected ? 'fill-black' : 'fill-current'}`} />
                    <span>Enter {t(`mode_${modeId}`)}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Feature Badges Footer */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="glass rounded-xl p-2.5 text-[11px] font-bold text-neutral-300 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>{t('featRealtime')}</span>
            </div>
            <div className="glass rounded-xl p-2.5 text-[11px] font-bold text-neutral-300 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('featCards')}</span>
            </div>
            <div className="glass rounded-xl p-2.5 text-[11px] font-bold text-neutral-300 flex items-center justify-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-pink-400" />
              <span>{t('featMic')}</span>
            </div>
            <div className="glass rounded-xl p-2.5 text-[11px] font-bold text-neutral-300 flex items-center justify-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-spotify" />
              <span>{t('featSpotify')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
};
