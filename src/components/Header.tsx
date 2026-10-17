import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { LANGS } from '../lib/translations';
import { isSfxMuted, setSfxMuted, sfx } from '../lib/sfx';
import { music } from '../lib/audio';
import { useGame } from '../lib/net';
import { useAuth } from '../lib/authContext';
import { Volume2, VolumeX, Globe, Trophy, Sparkles, Sliders, BookOpen } from 'lucide-react';
import type { Lang } from '../../shared/types';

interface Props {
  onOpenCompendium: () => void;
  onOpenLeaderboard: () => void;
  onOpenHowToPlay: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<Props> = ({ onOpenCompendium, onOpenLeaderboard, onOpenHowToPlay, onOpenAuth }) => {
  const { lang, setLang, t } = useI18n();
  const { connected } = useGame();
  const { user } = useAuth();
  const [muted, setMutedState] = useState(isSfxMuted());
  const [vol, setVol] = useState(music.volume);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showVolSlider, setShowVolSlider] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setSfxMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    music.setVolume(v);
  };

  return (
    <header className="sticky top-0 z-30 w-full glass border-b border-white/10 px-4 py-3 flex items-center justify-between">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-spotify to-emerald-400 p-1 flex items-center justify-center shadow-lg shadow-spotify/25">
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
            <circle cx="32" cy="32" r="22" fill="#0f0f11" />
            <rect x="20" y="26" width="4" height="12" rx="2" fill="#1ed760" />
            <rect x="27" y="20" width="4" height="24" rx="2" fill="#1ed760" />
            <rect x="34" y="23" width="4" height="18" rx="2" fill="#1ed760" />
            <rect x="41" y="28" width="4" height="8" rx="2" fill="#1ed760" />
          </svg>
        </div>
        <div>
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
            Spoti<span className="text-spotify">Quiz</span>
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-spotify animate-pulse' : 'bg-rose-500'}`} />
          <span className={connected ? 'text-neutral-300' : 'text-rose-400'}>
            {connected ? t('online') : t('offline')}
          </span>
        </div>

        {/* How to Play */}
        <button
          onClick={() => {
            sfx.click();
            onOpenHowToPlay();
          }}
          className="btn-ghost !p-2 rounded-xl text-neutral-300 hover:text-white flex items-center gap-1.5 text-xs font-bold"
          title={lang === 'th' ? 'วิธีการเล่น' : 'How to Play'}
        >
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">{lang === 'th' ? 'วิธีการเล่น' : 'How to Play'}</span>
        </button>

        {/* Card Compendium */}
        <button
          onClick={() => {
            sfx.click();
            onOpenCompendium();
          }}
          className="btn-ghost !p-2 rounded-xl text-neutral-300 hover:text-white flex items-center gap-1.5 text-xs font-bold"
          title={t('navCards')}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">{t('navCards')}</span>
        </button>

        {/* Leaderboard */}
        <button
          onClick={() => {
            sfx.click();
            onOpenLeaderboard();
          }}
          className="btn-ghost !p-2 rounded-xl text-neutral-300 hover:text-white flex items-center gap-1.5 text-xs font-bold"
          title={t('navLeaderboard')}
        >
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="hidden md:inline">{t('navLeaderboard')}</span>
        </button>

        {/* Google & Spotify Account Profile Button */}
        <button
          onClick={() => {
            sfx.click();
            onOpenAuth();
          }}
          className={`p-1.5 md:px-3 md:py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            user
              ? 'border-spotify/50 bg-spotify/15 text-white hover:bg-spotify/25 shadow-md shadow-spotify/20'
              : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white'
          }`}
          title={user ? `${user.displayName} (${user.provider})` : 'Sign in with Google / Spotify'}
        >
          {user ? (
            <>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-spotify"
                />
              ) : (
                <span className="text-xs">{user.provider === 'spotify' ? '🟢' : '🔵'}</span>
              )}
              <span className="hidden sm:inline max-w-[90px] truncate">{user.displayName}</span>
            </>
          ) : (
            <>
              <div className="flex items-center -space-x-1">
                {/* Google Mini Logo */}
                <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5 shadow shrink-0">
                  <svg viewBox="0 0 24 24" className="w-full h-full">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </span>
                {/* Spotify Mini Logo */}
                <span className="w-4 h-4 rounded-full bg-spotify flex items-center justify-center p-0.5 shadow shrink-0">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-black">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </span>
              </div>
              <span className="hidden sm:inline">{lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
            </>
          )}
        </button>

        {/* Volume & SFX toggle */}
        <div className="relative">
          <button
            onClick={() => setShowVolSlider(!showVolSlider)}
            className="btn-ghost !p-2 rounded-xl text-neutral-300 hover:text-white"
            title="Audio settings"
          >
            {muted || vol === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {showVolSlider && (
            <div className="absolute right-0 mt-2 w-48 glass-strong rounded-2xl p-3 border border-white/10 shadow-2xl z-50 animate-fade-up space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-spotify" />
                  <span>Master Vol</span>
                </span>
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
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => {
                    music.toggleReduction();
                    setVol(music.volume);
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    music.isReduced ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {music.isReduced ? '50% (ON)' : 'Quiet 50%'}
                </button>
                <button
                  onClick={toggleMute}
                  className="py-1 px-2 rounded-lg text-[10px] font-bold bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10"
                >
                  {muted ? 'SFX Off' : 'SFX On'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              sfx.click();
              setShowLangMenu(!showLangMenu);
            }}
            className="btn-ghost !p-2 rounded-xl text-neutral-300 hover:text-white flex items-center gap-1 text-xs font-bold"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="uppercase">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-36 glass-strong rounded-2xl py-1.5 border border-white/10 shadow-2xl z-50 animate-fade-up">
              {LANGS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    sfx.click();
                    setLang(item.id as Lang);
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-white/10 ${
                    lang === item.id ? 'text-spotify bg-white/5' : 'text-neutral-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </span>
                  {lang === item.id && <span className="w-1.5 h-1.5 rounded-full bg-spotify" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
