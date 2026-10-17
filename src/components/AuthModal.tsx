import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { useI18n } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { getSpotifyConfig } from '../lib/spotifyAuth';
import { X, LogOut, CheckCircle2, Play, User, AlertCircle, Copy, Check, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, signInGoogle, signInSpotify, enterAsGuest, signOut } = useAuth();
  const { lang } = useI18n();

  const [copied, setCopied] = useState(false);
  const [showSpotifyHelp, setShowSpotifyHelp] = useState(false);

  const { redirectUri } = getSpotifyConfig();

  if (!isOpen) return null;

  const handleCopyUri = (uri: string) => {
    sfx.click();
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGuest = () => {
    sfx.click();
    enterAsGuest();
    onClose();
  };

  const handleGoogle = async () => {
    sfx.click();
    await signInGoogle();
    onClose();
  };

  const handleSpotify = async () => {
    sfx.click();
    await signInSpotify();
    onClose();
  };

  // Alternative redirect URI with/without trailing slash
  const altUri = redirectUri.endsWith('/') ? redirectUri.slice(0, -1) : `${redirectUri}/`;

  const handleToggleSlash = (uriToUse: string) => {
    sfx.click();
    localStorage.setItem('sq.spotify.redirectUri', uriToUse);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
      <div className="glass-strong rounded-3xl max-w-md w-full border border-white/10 shadow-2xl overflow-hidden relative bg-neutral-950/95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-spotify to-emerald-400 p-1.5 flex items-center justify-center shadow-lg shadow-spotify/25 shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
                <circle cx="32" cy="32" r="22" fill="#0f0f11" />
                <rect x="20" y="26" width="4" height="12" rx="2" fill="#1ed760" />
                <rect x="27" y="20" width="4" height="24" rx="2" fill="#1ed760" />
                <rect x="34" y="23" width="4" height="18" rx="2" fill="#1ed760" />
                <rect x="41" y="28" width="4" height="8" rx="2" fill="#1ed760" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-white leading-tight">
                {user
                  ? (lang === 'th' ? 'โปรไฟล์ของคุณ' : 'Your Profile')
                  : (lang === 'th' ? 'เข้าสู่ระบบ SpotiQuiz' : 'Sign in to SpotiQuiz')}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {user
                  ? (lang === 'th' ? 'จัดการข้อมูลบัญชีและการซิงค์' : 'Manage your connected profile')
                  : (lang === 'th' ? 'กรุณาเลือกช่องทางการเข้าสู่ระบบก่อนเริ่มเล่น' : 'Please choose your login method to start playing')}
              </p>
            </div>
          </div>

          {/* Close button: only available if user is already logged in or in guest mode */}
          {user && (
            <button
              onClick={() => {
                sfx.click();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {user ? (
            /* Signed In User Profile View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl glass border border-spotify/30 bg-gradient-to-b from-spotify/10 to-transparent flex items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-spotify/50 shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-spotify/20 border border-spotify/40 flex items-center justify-center text-2xl">
                    {user.provider === 'spotify' ? '🟢' : '🔵'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white truncate">{user.displayName}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-spotify/20 text-spotify border border-spotify/30 shrink-0">
                      {user.provider}
                    </span>
                  </div>
                  {user.email && (
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{user.email}</p>
                  )}
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {lang === 'th' ? 'เชื่อมต่อเรียบร้อยแล้ว' : 'Connected & Synced'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-300 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span>✨ สิทธิพิเศษของบัญชีนี้:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-1">
                  <li>ซิงค์ชื่อและรูปโปรไฟล์ลงในห้องล็อบบี้ทันที</li>
                  <li>บันทึกสถิติและคะแนนสูงสุดลงใน Hall of Fame</li>
                  {user.provider === 'spotify' && (
                    <li className="text-spotify font-semibold">เข้าถึงเพลย์ลิสต์ส่วนตัวใน Spotify สำหรับใช้ทายเพลง</li>
                  )}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    sfx.click();
                    onClose();
                  }}
                  className="btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-spotify/25"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>{lang === 'th' ? 'เล่นเกมต่อ' : 'Continue to Game'}</span>
                </button>
                <button
                  onClick={async () => {
                    sfx.click();
                    await signOut();
                  }}
                  className="py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated: Mandatory Sign In Options */
            <div className="space-y-3.5">
              {/* Google Sign-in Button */}
              <button
                onClick={handleGoogle}
                className="w-full p-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-between group transition-all duration-200 shadow-lg hover:border-white/40 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-2 shadow-md shrink-0">
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-sm text-white">Continue with Google</div>
                    <div className="text-[11px] text-neutral-400">เข้าสู่ระบบด้วยบัญชี Google</div>
                  </div>
                </div>
                <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">➔</span>
              </button>

              {/* Spotify Sign-in Button */}
              <button
                onClick={handleSpotify}
                className="w-full p-4 rounded-2xl border border-spotify/40 bg-spotify/15 hover:bg-spotify/25 text-white font-bold text-sm flex items-center justify-between group transition-all duration-200 shadow-lg shadow-spotify/15 hover:border-spotify cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-spotify flex items-center justify-center p-2 shadow-md shrink-0">
                    <svg viewBox="0 0 24 24" className="w-full h-full fill-black">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-sm text-spotify">Connect with Spotify</div>
                    <div className="text-[11px] text-neutral-300">เชื่อมต่อเพลย์ลิสต์ Spotify ส่วนตัว</div>
                  </div>
                </div>
                <span className="text-xs text-spotify group-hover:translate-x-0.5 transition-transform">➔</span>
              </button>

              {/* Spotify Redirect URI Helper Box for "Not matching configuration" Fix */}
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spotify Redirect URI (สำหรับแก้บั๊ก Not matching):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyUri(redirectUri)}
                    className="text-spotify hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
                  </button>
                </div>

                <div className="font-mono bg-black/70 p-2 rounded-xl text-neutral-200 text-[11px] select-all break-all border border-white/5">
                  {redirectUri}
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                  <span>สลับแบบเครื่องหมาย / ท้าย:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSlash(altUri)}
                    className="text-cyan-400 hover:underline cursor-pointer font-mono"
                  >
                    สลับเป็น {altUri}
                  </button>
                </div>

                <p className="text-[10px] text-neutral-300 leading-relaxed border-t border-white/5 pt-1.5">
                  📌 <strong>วิธีแก้ Not matching configuration:</strong> ใน <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-spotify underline">Spotify Dashboard</a> &gt; เข้า App &gt; <strong>Settings</strong> &gt; เพิ่ม URL ด้านบนนี้ในช่อง <strong>Redirect URIs</strong> แล้วกด <strong>Save</strong>
                </p>
              </div>

              {/* Continue as Guest Button */}
              <div className="pt-1">
                <button
                  onClick={handleGuest}
                  className="w-full py-3.5 px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <User className="w-4 h-4 text-neutral-400" />
                  <span>{lang === 'th' ? 'เข้าเล่นแบบผู้มาเยือน (Continue as Guest)' : 'Continue as Guest'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
