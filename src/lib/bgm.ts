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

// Curated default developer radio tracks (popular, high energy & chill)
const DEFAULT_TRACKS: BgmTrack[] = [
  {
    id: 'bgm-1',
    title: 'Levitating',
    artist: 'Dua Lipa',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bf/f9/06/bff90605-728b-d72b-8106-25916327b9c9/190295286105.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/4e/d6/35/4ed6354b-d7fa-5d07-6b08-81e0586ee2b3/mzaf_10334887965942475971.plus.aac.p.m4a',
  },
  {
    id: 'bgm-2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/00/a3/98/00a39818-8424-9b1d-cfa5-1ff25c48b26a/20UMGIM08611.rgb.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/28/7f/0a/287f0ae2-8254-8e62-c1b7-951b1f13b632/mzaf_11303120158428800057.plus.aac.p.m4a',
  },
  {
    id: 'bgm-3',
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/80/7e/61/807e61bf-1eb9-a86f-3957-6e3e571e2efd/075679633576.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c3/82/06/c38206d2-646f-d10d-83b6-ae380ae8463c/mzaf_7493630737477610057.plus.aac.p.m4a',
  },
  {
    id: 'bgm-4',
    title: 'โต๊ะริม (melt)',
    artist: 'NONT TANONT',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/65/59/aa/6559aa2b-877f-1d48-6a56-da242d480cb4/cover.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/f5/63/8e/f5638eb0-6126-df8a-0d85-a764d2627cb6/mzaf_7867657519688463568.plus.aac.p.m4a',
  },
  {
    id: 'bgm-5',
    title: 'ซ่อนกลิ่น',
    artist: 'Palmy',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/fc/c9/7c/fcc97c9b-6484-984e-3375-9922e4ff9f7d/8850107612260.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/7e/d3/96/7ed396aa-2831-294b-97fa-ceb5b328639d/mzaf_3992297121706059910.plus.aac.p.m4a',
  },
  {
    id: 'bgm-6',
    title: 'Super Shy',
    artist: 'NewJeans',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/28/62/7b/28627b0b-cf10-9174-8b6a-93a8cf82f508/196922475960_Cover.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/64/00/17/64001712-b258-cfef-156d-e9e9a4fba4ca/mzaf_1052733979857999863.plus.aac.p.m4a',
  },
  {
    id: 'bgm-7',
    title: 'Wake Me Up',
    artist: 'Avicii',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/37/80/7e/37807ec1-8071-872f-5192-ee1d892040b2/00602537541604.rgb.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/c3/0f/73/c30f7356-9a2d-ec3d-31eb-4752670e458e/mzaf_12410886737526779435.plus.aac.p.m4a',
  },
  {
    id: 'bgm-8',
    title: 'Midnight City',
    artist: 'M83',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4e/ff/3c/4eff3cc0-25e2-6df9-8664-884bc78d655f/cover.jpg/300x300bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/07/78/c1/0778c187-b962-d278-df12-ae293b67c3e1/mzaf_785669938830022416.plus.aac.p.m4a',
  },
];

class BgmManager {
  private audio: HTMLAudioElement | null = null;
  private playlistName = 'Jam!Quiz Developer Radio';
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

  constructor() {
    this.loadSavedPlaylist();
    if (typeof window !== 'undefined') {
      // Auto-unlock on first user interaction if blocked by autoplay policy
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
      const saved = localStorage.getItem('jamquiz_dev_bgm_playlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.tracks?.length > 0) {
          this.playlistName = parsed.name || this.playlistName;
          this.cover = parsed.cover || this.cover;
          this.tracks = parsed.tracks;
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
        this.next();
      });

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio && !isNaN(this.audio.currentTime)) {
          this.savedPosition = this.audio.currentTime;
          this.notify();
        }
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('[BGM Engine] Track playback error, advancing to next:', e);
        setTimeout(() => this.next(), 1000);
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
    if (typeof index === 'number' && index >= 0 && index < this.tracks.length) {
      if (this.currentIndex !== index) {
        this.currentIndex = index;
        this.savedPosition = 0;
      }
    }

    const track = this.tracks[this.currentIndex];
    if (!track || !track.previewUrl) return;

    const audio = this.getAudio();
    const rawUrl = track.previewUrl;
    const streamUrl = getApiUrl(`/api/preview?url=${encodeURIComponent(rawUrl)}`);

    if (audio.src !== streamUrl) {
      audio.src = streamUrl;
      audio.load();
    }

    if (this.savedPosition > 0 && Math.abs(audio.currentTime - this.savedPosition) > 1) {
      audio.currentTime = this.savedPosition;
    }

    audio.volume = this.isMuted ? 0 : this.volume;
    audio.play().then(() => {
      this.isPlaying = true;
      this.notify();
    }).catch((err) => {
      console.log('[BGM] Waiting for user interaction to autoplay:', err.message);
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

    try {
      localStorage.setItem(
        'jamquiz_dev_bgm_playlist',
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
