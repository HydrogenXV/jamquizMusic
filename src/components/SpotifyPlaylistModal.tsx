import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchUserSpotifyPlaylists,
  FEATURED_SPOTIFY_PLAYLISTS,
  type SpotifyPlaylistSummary,
  getSpotifyToken,
} from '../lib/spotifyAuth';
import { useAuth } from '../lib/authContext';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import {
  X,
  Music,
  Search,
  RotateCw,
  Link,
  Sparkles,
  ExternalLink,
  Check,
  Disc3,
  LogIn,
  AlertCircle,
  FolderHeart,
  Globe,
  Lock,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlaylist: (playlistIdOrUrl: string, token?: string) => void;
  isImporting?: boolean;
}

export const SpotifyPlaylistModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectPlaylist,
  isImporting = false,
}) => {
  const { user, signInSpotify } = useAuth();
  const { t, lang } = useI18n();

  const isSpotifyUser = user?.provider === 'spotify';
  const [activeTab, setActiveTab] = useState<'my' | 'featured' | 'url'>(
    isSpotifyUser ? 'my' : 'featured'
  );

  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load user playlists when modal opens or user logs in
  const loadPlaylists = async () => {
    const token = getSpotifyToken();
    if (!token && !isSpotifyUser) return;

    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserSpotifyPlaylists();
      setUserPlaylists(list);
    } catch (err: any) {
      console.error('Failed to load Spotify playlists:', err);
      if (err?.message === 'token_expired') {
        setError(
          lang === 'th'
            ? 'เซสชัน Spotify หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง'
            : 'Spotify session expired. Please sign in again.'
        );
      } else {
        setError(
          lang === 'th'
            ? 'ไม่สามารถดึงข้อมูลเพลย์ลิสต์ได้ กรุณาลองใหม่อีกครั้ง'
            : 'Unable to load playlists. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isSpotifyUser) {
        setActiveTab('my');
        loadPlaylists();
      } else {
        setActiveTab('featured');
      }
    }
  }, [isOpen, isSpotifyUser]);

  const handleSelect = (pl: SpotifyPlaylistSummary) => {
    sfx.click();
    setSelectedId(pl.id);
    const token = getSpotifyToken() || undefined;
    onSelectPlaylist(pl.id, token);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    sfx.click();
    const token = getSpotifyToken() || undefined;
    onSelectPlaylist(customUrl.trim(), token);
  };

  const handleSpotifyLogin = async () => {
    sfx.click();
    try {
      await signInSpotify();
    } catch (err) {
      console.error('Spotify login error:', err);
    }
  };

  // Filter playlists by search query
  const filteredUserPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return userPlaylists;
    const q = searchQuery.toLowerCase();
    return userPlaylists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.owner?.toLowerCase().includes(q)
    );
  }, [userPlaylists, searchQuery]);

  const filteredFeaturedPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return FEATURED_SPOTIFY_PLAYLISTS;
    const q = searchQuery.toLowerCase();
    return FEATURED_SPOTIFY_PLAYLISTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-up">
      <div className="glass-strong rounded-3xl max-w-2xl w-full border border-white/10 shadow-2xl overflow-hidden relative bg-neutral-950/95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-spotify/20 border border-spotify/40 flex items-center justify-center text-spotify shadow-lg shadow-spotify/20">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-white leading-tight flex items-center gap-2">
                <span>{lang === 'th' ? 'นำเข้าเพลย์ลิสต์ Spotify' : 'Import Spotify Playlist'}</span>
                {isSpotifyUser && (
                  <span className="text-[10px] bg-spotify/20 text-spotify border border-spotify/30 px-2 py-0.5 rounded-full font-bold">
                    Connected
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isSpotifyUser
                  ? (lang === 'th'
                      ? `บัญชี: ${user?.displayName || 'Spotify User'} — เลือกเพลย์ลิสต์ของคุณเพื่อเริ่มเล่น`
                      : `Connected as ${user?.displayName || 'Spotify User'} — Pick a playlist to duel`)
                  : (lang === 'th'
                      ? 'เลือกเพลย์ลิสต์แนะนำ หรือเข้าสู่ระบบด้วย Spotify เพื่อดึงเพลย์ลิสต์ของคุณ'
                      : 'Choose featured playlist or connect Spotify to browse your library')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-5 shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setActiveTab('my');
            }}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'my'
                ? 'border-spotify text-spotify'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เพลย์ลิสต์ของฉัน' : 'My Playlists'}</span>
            {isSpotifyUser && userPlaylists.length > 0 && (
              <span className="text-[10px] bg-spotify/20 text-spotify px-1.5 py-0.2 rounded-full font-mono">
                {userPlaylists.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.click();
              setActiveTab('featured');
            }}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'featured'
                ? 'border-spotify text-spotify'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เพลงฮิตแนะนำ' : 'Featured Hits'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.click();
              setActiveTab('url');
            }}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-spotify text-spotify'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'วางลิงก์ URL' : 'Paste URL'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
          {/* Tab 1: My Playlists */}
          {activeTab === 'my' && (
            <div className="space-y-4">
              {!isSpotifyUser ? (
                /* Prompt to login if not logged in with Spotify */
                <div className="p-6 rounded-2xl bg-spotify/10 border border-spotify/30 text-center space-y-4 my-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-spotify/20 flex items-center justify-center text-spotify shadow-lg shadow-spotify/20">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">
                      {lang === 'th'
                        ? 'เข้าสู่ระบบด้วย Spotify เพื่อเลือกเพลย์ลิสต์ของคุณ'
                        : 'Sign in with Spotify to access your playlists'}
                    </h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                      {lang === 'th'
                        ? 'เชื่อมต่อบัญชี Spotify ของคุณเพื่อนำเข้าเพลย์ลิสต์ส่วนตัว หรือเพลย์ลิสต์ที่บันทึกไว้ได้ทันทีในคลิกเดียว'
                        : 'Connect your Spotify account to instantly import your public and private playlists in one click.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSpotifyLogin}
                    className="btn-primary py-3 px-6 text-xs font-black shadow-lg shadow-spotify/30 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{lang === 'th' ? 'เข้าสู่ระบบ Spotify ตอนนี้' : 'Sign in with Spotify'}</span>
                  </button>
                </div>
              ) : (
                /* Connected view */
                <>
                  {/* Search and Refresh bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                          lang === 'th'
                            ? 'ค้นหาในเพลย์ลิสต์ของคุณ…'
                            : 'Search in your playlists…'
                        }
                        className="input-field pl-9 text-xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={loadPlaylists}
                      disabled={loading}
                      title={lang === 'th' ? 'รีเฟรช' : 'Refresh'}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-spotify' : ''}`} />
                    </button>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-red-300 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSpotifyLogin}
                        className="text-[11px] font-bold underline hover:text-white shrink-0"
                      >
                        {lang === 'th' ? 'เข้าสู่ระบบใหม่' : 'Re-login'}
                      </button>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
                      <Disc3 className="w-8 h-8 text-spotify animate-spin" />
                      <p className="text-xs font-bold">
                        {lang === 'th' ? 'กำลังโหลดเพลย์ลิสต์จาก Spotify…' : 'Loading playlists from Spotify…'}
                      </p>
                    </div>
                  ) : filteredUserPlaylists.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400 space-y-2">
                      <FolderHeart className="w-10 h-10 mx-auto text-neutral-600" />
                      <p className="text-sm font-bold text-neutral-300">
                        {searchQuery
                          ? (lang === 'th' ? 'ไม่พบเพลย์ลิสต์ที่ตรงกับการค้นหา' : 'No playlists matched your search')
                          : (lang === 'th' ? 'ยังไม่มีเพลย์ลิสต์ในบัญชี Spotify ของคุณ' : 'No playlists found in your Spotify account')}
                      </p>
                      <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                        {lang === 'th'
                          ? 'ลองสลับไปที่แท็บ "เพลงฮิตแนะนำ" เพื่อเล่นเพลย์ลิสต์ยอดนิยมได้ทันที'
                          : 'Try switching to "Featured Hits" tab to play popular curated playlists.'}
                      </p>
                    </div>
                  ) : (
                    /* Playlist Cards Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                      {filteredUserPlaylists.map((pl) => {
                        const isSelected = selectedId === pl.id;
                        return (
                          <div
                            key={pl.id}
                            className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-3 group relative overflow-hidden ${
                              isSelected
                                ? 'bg-spotify/20 border-spotify shadow-lg shadow-spotify/20 ring-1 ring-spotify'
                                : 'glass hover:bg-white/10 border-white/10 hover:border-spotify/50'
                            }`}
                          >
                            {/* Playlist Cover */}
                            <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-white/10 shrink-0 overflow-hidden relative shadow-inner">
                              {pl.cover ? (
                                <img
                                  src={pl.cover}
                                  alt={pl.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-spotify bg-spotify/15">
                                  <Music className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-black text-white truncate group-hover:text-spotify transition-colors">
                                {pl.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                                <span className="font-mono text-spotify font-bold">
                                  {pl.trackCount} {t('tracks')}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-[10px]">
                                  {pl.isPublic ? (
                                    <>
                                      <Globe className="w-2.5 h-2.5 text-neutral-400" />
                                      <span>Public</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-2.5 h-2.5 text-yellow-400" />
                                      <span className="text-yellow-400">Private</span>
                                    </>
                                  )}
                                </span>
                              </div>
                              {pl.owner && (
                                <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                                  by {pl.owner}
                                </p>
                              )}
                            </div>

                            {/* Select / Import Button */}
                            <button
                              type="button"
                              onClick={() => handleSelect(pl)}
                              disabled={isImporting && isSelected}
                              className={`shrink-0 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected && isImporting
                                  ? 'bg-spotify/30 text-spotify border border-spotify/50'
                                  : 'bg-spotify text-black hover:bg-emerald-400 shadow-md shadow-spotify/20 hover:scale-105'
                              }`}
                            >
                              {isSelected && isImporting ? (
                                <>
                                  <Disc3 className="w-3.5 h-3.5 animate-spin" />
                                  <span>{t('importing')}</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{lang === 'th' ? 'เลือก' : 'Select'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab 2: Featured Hits */}
          {activeTab === 'featured' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'th'
                      ? 'ค้นหาในเพลงฮิตแนะนำ…'
                      : 'Search featured playlists…'
                  }
                  className="input-field pl-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredFeaturedPlaylists.map((pl) => {
                  const isSelected = selectedId === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-3 group relative overflow-hidden ${
                        isSelected
                          ? 'bg-spotify/20 border-spotify shadow-lg shadow-spotify/20 ring-1 ring-spotify'
                          : 'glass hover:bg-white/10 border-white/10 hover:border-spotify/50'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-white/10 shrink-0 overflow-hidden relative shadow-inner">
                        <img
                          src={pl.cover}
                          alt={pl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-white truncate group-hover:text-spotify transition-colors">
                          {pl.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {pl.description}
                        </p>
                        <span className="inline-block mt-1 text-[10px] text-spotify font-mono font-bold">
                          {pl.trackCount} {t('tracks')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelect(pl)}
                        disabled={isImporting && isSelected}
                        className={`shrink-0 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected && isImporting
                            ? 'bg-spotify/30 text-spotify border border-spotify/50'
                            : 'bg-spotify text-black hover:bg-emerald-400 shadow-md shadow-spotify/20 hover:scale-105'
                        }`}
                      >
                        {isSelected && isImporting ? (
                          <>
                            <Disc3 className="w-3.5 h-3.5 animate-spin" />
                            <span>{t('importing')}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'เลือก' : 'Select'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Custom URL */}
          {activeTab === 'url' && (
            <div className="space-y-4 py-2">
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">
                  {lang === 'th' ? 'ใส่ลิงก์หรือ Playlist ID' : 'Playlist URL or ID'}
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcZDD7cfEStW"
                    className="input-field pl-9 text-xs"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customUrl.trim() || isImporting}
                  className="btn-primary w-full py-3 text-xs font-black shadow-lg shadow-spotify/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Disc3 className="w-4 h-4 animate-spin" />
                      <span>{t('importing')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'th' ? 'นำเข้าเพลย์ลิสต์นี้' : 'Import This Playlist'}</span>
                    </>
                  )}
                </button>
              </form>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-400 space-y-1.5">
                <p className="font-bold text-neutral-300">
                  💡 {lang === 'th' ? 'วิธีคัดลอกลิงก์จาก Spotify' : 'How to get a Spotify link'}:
                </p>
                <p>
                  1. {lang === 'th' ? 'เปิดแอพหรือเว็บ Spotify แล้วไปที่เพลย์ลิสต์ที่ต้องการ' : 'Open Spotify and navigate to your playlist.'}
                </p>
                <p>
                  2. {lang === 'th' ? 'กดปุ่มจุดสามจุด (…) ➔ แชร์ (Share) ➔ คัดลอกลิงก์ (Copy Link)' : 'Click (…) ➔ Share ➔ Copy Link to playlist.'}
                </p>
                <p>
                  3. {lang === 'th' ? 'นำมาวางในช่องด้านบนแล้วกดนำเข้าได้ทันที' : 'Paste the link above and click Import.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-spotify" />
            <span>
              {isSpotifyUser
                ? (lang === 'th' ? 'ระบบจะค้นหาตัวอย่างเสียง 30s อัตโนมัติ' : '30s preview tracks are auto-synced')
                : (lang === 'th' ? 'เข้าสู่ระบบด้วย Spotify เพื่อความสะดวกสูงสุด' : 'Sign in with Spotify for quick 1-click import')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="text-neutral-400 hover:text-white font-bold cursor-pointer"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
