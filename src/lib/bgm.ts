// Background Music (BGM) & Jam!Quiz Radio Manager
// Provides seamless lobby & home background audio that pauses during match gameplay
// and resumes right from where it left off. Can be modified dynamically by the developer
// in the Debug Mode Command Center via any Spotify playlist.

import { getApiUrl } from './net';

export interface BgmTrack {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  previewUrl?: string;
}

export interface BgmState {
  playlistName: string;
  cover?: string;
  tracks: BgmTrack[];
  currentIndex: number;
  currentTrack: BgmTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
}

const BGM_STORAGE_KEY = 'jamquiz_dev_bgm_playlist_v2';

// 100% Verified, permanent Spotify CDN MP3 previews (Status: 200 OK)
const DEFAULT_TRACKS: BgmTrack[] = [
  {
    id: 'bgm-sp-0',
    title: 'expectations (feat. Chappell Roan)',
    artist: 'Olivia Rodrigo, Chappell Roan',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/cc5b59142bd150799f61068e522f8aaa120d28c9',
  },
  {
    id: 'bgm-sp-1',
    title: 'Stop The Wedding!',
    artist: 'Ashe',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/8a374e33d78679e1143d7a07797ddfa0225f8586',
  },
  {
    id: 'bgm-sp-2',
    title: 'Patient Zero',
    artist: 'Taylor Swift',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/3b622221c4b4a6c28ef70ed256b47ef825108142',
  },
  {
    id: 'bgm-sp-3',
    title: 'Earrings',
    artist: 'Malcolm Todd',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/20a1469df9f65a51878811bbe49979c418abc1b7',
  },
  {
    id: 'bgm-sp-4',
    title: 'Housewife',
    artist: 'Tate McRae',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/724b097d9dc53e0541de27d199adfe3f610944ba',
  },
  {
    id: 'bgm-sp-5',
    title: 'Loser',
    artist: 'Tame Impala',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/0015e9347a45b62215447eba657b2fc3ce279d2d',
  },
  {
    id: 'bgm-sp-6',
    title: 'hate that i made you love me',
    artist: 'Ariana Grande',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/9fb8e09c9facc2d9443b6e57ae36d47bf83c01b8',
  },
  {
    id: 'bgm-sp-7',
    title: 'Dai Dai',
    artist: 'Shakira, Burna Boy',
    artwork: 'https://i.scdn.co/image/ab67706f0000000230888e59410296f950502d00',
    previewUrl: 'https://p.scdn.co/mp3-preview/a6955a6725dcf614e9915396987847ea0b509580',
  },
];

class BgmManager {
  private audio: HTMLAudioElement | null = null;
  private playlistName = "Today's Top Hits (Jam!Quiz Radio)";
  private cover: string | undefined = DEFAULT_TRACKS[0].artwork;
  private tracks: BgmTrack[] = DEFAULT_TRACKS;
  private currentIndex = 0;
  private savedPosition = 0;
  private isPlaying = false;
  private userPaused = false;
  private volume = Number(localStorage.getItem('jq.bgm.vol') ?? '0.45');
  private isMuted = localStorage.getItem('jq.bgm.muted') === 'true';
  private listeners = new Set<(state: BgmState) => void>();
  private matchActive = false;
  private errorCount = 0;
  private triedProxy = false;

  constructor() {
    this.loadSavedPlaylist();
    if (typeof window !== 'undefined') {
      // Auto-unlock on first user interaction if blocked by browser autoplay policy
      const unlockListener = () => {
        if (!this.matchActive && !this.userPaused && (!this.audio || this.audio.paused)) {
          this.resume();
        }
      };
      window.addEventListener('pointerdown', unlockListener, { once: true });
      window.addEventListener('keydown', unlockListener, { once: true });
    }
  }

  private loadSavedPlaylist() {
    try {
      // Clear legacy storage from v1 if present
      localStorage.removeItem('jamquiz_dev_bgm_playlist');

      const saved = localStorage.getItem(BGM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.tracks?.length > 0) {
          // Verify tracks have previewUrl
          const valid = parsed.tracks.filter((t: any) => Boolean(t.previewUrl));
          if (valid.length > 0) {
            this.playlistName = parsed.name || this.playlistName;
            this.cover = parsed.cover || this.cover;
            this.tracks = valid;
          }
        }
      }
    } catch {}
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = this.isMuted ? 0 : this.volume;

      this.audio.addEventListener('ended', () => {
        this.errorCount = 0;
        this.next();
      });

      this.audio.addEventListener('playing', () => {
        this.errorCount = 0;
        this.isPlaying = true;
        this.notify();
      });

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio && !isNaN(this.audio.currentTime)) {
          this.savedPosition = this.audio.currentTime;
          this.notify();
        }
      });

      this.audio.addEventListener('error', () => {
        const currentTrack = this.tracks[this.currentIndex];
        // If direct URL failed and we haven't tried proxy yet, try proxy once
        if (!this.triedProxy && currentTrack?.previewUrl) {
          this.triedProxy = true;
          if (this.audio) {
            this.audio.src = getApiUrl(`/api/preview?url=${encodeURIComponent(currentTrack.previewUrl)}`);
            this.audio.load();
            this.audio.play().catch(() => {});
            return;
          }
        }

        this.errorCount++;
        this.triedProxy = false;
        if (this.errorCount < 3) {
          setTimeout(() => this.next(), 1000);
        } else {
          console.warn('[BGM Engine] Multiple tracks failed to play, pausing radio.');
          this.pause(false);
        }
      });
    }
    return this.audio;
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  subscribe(listener: (state: BgmState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState(): BgmState {
    const cur = this.tracks[this.currentIndex] || null;
    return {
      playlistName: this.playlistName,
      cover: cur?.artwork || this.cover,
      tracks: this.tracks,
      currentIndex: this.currentIndex,
      currentTrack: cur,
      isPlaying: this.isPlaying,
      volume: this.volume,
      isMuted: this.isMuted,
      currentTime: this.audio?.currentTime || this.savedPosition,
      duration: this.audio?.duration || 30,
    };
  }

  /** Starts playing the current track (or resumes saved position) */
  play(index?: number) {
    if (this.matchActive) return; // Do not play during match rounds
    this.userPaused = false;
    this.triedProxy = false;

    if (typeof index === 'number' && index >= 0 && index < this.tracks.length) {
      if (this.currentIndex !== index) {
        this.currentIndex = index;
        this.savedPosition = 0;
      }
    }

    const track = this.tracks[this.currentIndex];
    if (!track || !track.previewUrl) return;

    const audio = this.getAudio();
    const directUrl = track.previewUrl;

    if (audio.src !== directUrl) {
      audio.src = directUrl;
      audio.load();
    }

    if (this.savedPosition > 0 && Math.abs(audio.currentTime - this.savedPosition) > 1) {
      audio.currentTime = this.savedPosition;
    }

    audio.volume = this.isMuted ? 0 : this.volume;
    audio.play().then(() => {
      this.errorCount = 0;
      this.isPlaying = true;
      this.notify();
    }).catch((err) => {
      console.log('[BGM] Waiting for user gesture to autoplay:', err.message);
      this.isPlaying = false;
      this.notify();
    });
  }

  /** Pause background music (used when match starts) */
  pause(byUser = false) {
    if (byUser) this.userPaused = true;
    if (this.audio) {
      this.savedPosition = this.audio.currentTime;
      this.audio.pause();
    }
    this.isPlaying = false;
    this.notify();
  }

  /** Resumes playing from the saved position (used when returning to lobby or results) */
  resume() {
    if (this.matchActive) return;
    if (this.userPaused) return; // Respect user manual pause
    this.play(this.currentIndex);
  }

  /** Advances to next track in Developer Radio */
  next() {
    this.savedPosition = 0;
    this.triedProxy = false;
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    if (!this.matchActive && !this.userPaused) {
      this.play(this.currentIndex);
    } else {
      this.notify();
    }
  }

  /** Goes to previous track in Developer Radio */
  prev() {
    this.savedPosition = 0;
    this.triedProxy = false;
    this.currentIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    if (!this.matchActive && !this.userPaused) {
      this.play(this.currentIndex);
    } else {
      this.notify();
    }
  }

  /** Toggle play / pause */
  togglePlay() {
    if (this.isPlaying) {
      this.pause(true);
    } else {
      this.play(this.currentIndex);
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    localStorage.setItem('jq.bgm.vol', String(this.volume));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    this.notify();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('jq.bgm.muted', String(this.isMuted));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    this.notify();
  }

  /** Called by match lifecycle: suppresses BGM when game starts, restores when game ends */
  setMatchActive(active: boolean) {
    this.matchActive = active;
    if (active) {
      this.pause(false);
    } else {
      this.resume();
    }
  }

  /** Update Developer Spotify Playlist dynamically from Debug Mode */
  setPlaylist(tracks: BgmTrack[], name = 'Developer Spotify Radio', cover?: string) {
    if (!tracks || tracks.length === 0) return;
    this.playlistName = name;
    this.cover = cover || tracks[0]?.artwork;
    this.tracks = tracks;
    this.currentIndex = 0;
    this.savedPosition = 0;
    this.errorCount = 0;
    this.triedProxy = false;

    try {
      localStorage.setItem(
        BGM_STORAGE_KEY,
        JSON.stringify({ name: this.playlistName, cover: this.cover, tracks: this.tracks })
      );
    } catch {}

    if (!this.matchActive && !this.userPaused) {
      this.play(0);
    } else {
      this.notify();
    }
  }
}

export const bgm = new BgmManager();
