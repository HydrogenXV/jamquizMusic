import React, { useState } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import { AuthProvider } from './lib/authContext';
import { useGame } from './lib/net';
import { Header } from './components/Header';
import { CardCompendiumModal } from './components/CardCompendiumModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { AuthModal } from './components/AuthModal';
import { MusicPlayerWidget } from './components/MusicPlayerWidget';
import { Footer } from './components/Footer';
import { DebugModal } from './components/DebugModal';
import { music, isAudioSuspended, unlockAudio } from './lib/audio';
import { bgm } from './lib/bgm';

import { HomeView } from './views/HomeView';
import { LobbyView } from './views/LobbyView';
import { DraftView } from './views/DraftView';
import { PlayView } from './views/PlayView';
import { RevealView } from './views/RevealView';
import { ResultsView } from './views/ResultsView';

import { useAuth } from './lib/authContext';

import { Disc3, AlertCircle, CheckCircle2, Info, VolumeX } from 'lucide-react';

function AppContent() {
  const { room, you, toasts } = useGame();
  const { t, lang } = useI18n();
  const { user, guestEntered } = useAuth();

  const [showCompendium, setShowCompendium] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [audioSuspended, setAudioSuspended] = useState(false);

  // Mandatory login popup before accessing the app if unauthenticated
  const isAuthModalOpen = showAuth || (!user && !guestEntered);

  // Global keyboard shortcut for Developer Command Center (Ctrl+Shift+D or ` or ~)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) || e.key === '`' || e.key === '~') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Detect and prompt if browser suspended audio after page reload
  React.useEffect(() => {
    const check = () => setAudioSuspended(isAudioSuspended() && music.isPlaying);
    check();
    const id = setInterval(check, 800);
    return () => clearInterval(id);
  }, [room?.phase]);

  // Synchronize background music (Jam!Quiz Radio) lifecycle:
  // Plays on Home (!room) and Lobby (room.phase === 'lobby'),
  // Pauses when match begins (countdown, playing, reveal, draft),
  // Resumes seamlessly when match finishes (results, or back to lobby).
  React.useEffect(() => {
    const isMatch =
      room?.phase === 'countdown' ||
      room?.phase === 'playing' ||
      room?.phase === 'reveal' ||
      room?.phase === 'draft';

    bgm.setMatchActive(Boolean(isMatch));

    if (!room || room.phase === 'results' || room.phase === 'lobby') {
      music.stop();
    }
  }, [room?.phase]);

  return (
    <div
      onClick={() => {
        if (isAudioSuspended()) {
          unlockAudio();
          setAudioSuspended(false);
        }
        bgm.resume();
      }}
      className="min-h-screen bg-ink text-white flex flex-col aurora relative"
    >
      {/* Audio Autoplay unlock banner for browser tab restart */}
      {audioSuspended && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            unlockAudio();
            setAudioSuspended(false);
          }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-5 py-2.5 rounded-full font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer hover:scale-105 transition-transform border border-amber-300"
        >
          <VolumeX className="w-4 h-4 fill-black" />
          <span>
            {lang === 'th'
              ? '🔊 เบราว์เซอร์ปิดเสียงอยู่ — คลิกที่นี่เพื่อเปิดเสียง'
              : '🔊 Browser audio paused — Click anywhere to enable sound!'}
          </span>
        </div>
      )}

      {/* Global Header */}
      <Header
        onOpenCompendium={() => setShowCompendium(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onOpenAuth={() => setShowAuth(true)}
        onOpenDebug={() => setShowDebug(true)}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl glass-strong border shadow-2xl flex items-center gap-3 animate-slide-in pointer-events-auto ${
                toast.level === 'error'
                  ? 'border-red-500/50 bg-red-950/80 text-red-200'
                  : toast.level === 'success'
                  ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200'
                  : 'border-white/20 bg-neutral-900/90 text-white'
              }`}
            >
              {toast.level === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              ) : toast.level === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-cyan-400 shrink-0" />
              )}
              <span className="text-xs font-bold leading-snug">
                {t(toast.key.startsWith('t_') ? toast.key : `t_${toast.key}`, toast.params)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main Dynamic View Router */}
      <main className="flex-1">
        {!room ? (
          <HomeView
            onOpenCompendium={() => setShowCompendium(true)}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenAuth={() => setShowAuth(true)}
          />
        ) : room.phase === 'loading' ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-up">
            <div className="w-20 h-20 rounded-full bg-spotify/20 border-2 border-spotify flex items-center justify-center mb-4 shadow-xl shadow-spotify/20">
              <Disc3 className="w-12 h-12 text-spotify animate-spin-slow" />
            </div>
            <h3 className="text-2xl font-black text-white">{t('loadingTracks')}</h3>
            <p className="text-sm text-neutral-400 mt-1">{t('loadingSub')}</p>

            {typeof room.loadingProgress === 'number' && (
              <div className="w-64 bg-white/10 h-2 rounded-full overflow-hidden mt-4">
                <div
                  className="bg-spotify h-full transition-all duration-150"
                  style={{ width: `${Math.round(room.loadingProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        ) : room.phase === 'lobby' ? (
          <LobbyView room={room} you={you} />
        ) : room.phase === 'draft' ? (
          <DraftView room={room} you={you} />
        ) : room.phase === 'countdown' || room.phase === 'playing' ? (
          <PlayView room={room} you={you} />
        ) : room.phase === 'reveal' ? (
          <RevealView room={room} you={you} />
        ) : (
          <ResultsView room={room} you={you} />
        )}
      </main>

      {/* Global Modals */}
      <CardCompendiumModal
        open={showCompendium}
        onClose={() => setShowCompendium(false)}
      />
      <LeaderboardModal
        open={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
      <HowToPlayModal
        open={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setShowAuth(false)}
      />

      {/* Floating Bottom-Right Music Player Widget */}
      <MusicPlayerWidget room={room} onOpenDebug={() => setShowDebug(true)} />

      {/* Developer Debug Mode Command Center */}
      <DebugModal
        open={showDebug}
        onClose={() => setShowDebug(false)}
        room={room}
      />

      {/* Global Footer Credits */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}
