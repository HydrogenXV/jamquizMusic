import fs from 'node:fs';
import path from 'node:path';
import type { Track } from '../shared/types';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const CACHE_FILE = path.join(DATA_DIR, 'itunes-cache.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

type CacheEntry = { previewUrl?: string; artwork?: string; year?: number; at: number };
let cache: Record<string, CacheEntry> = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
} catch {
  cache = {};
}
let saveTimer: NodeJS.Timeout | null = null;
function persistCache() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFile(CACHE_FILE, JSON.stringify(cache), () => {});
  }, 1500);
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchWithTimeout(url: string, ms = 5000, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(init.headers || {}) } });
  } finally {
    clearTimeout(id);
  }
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Look up a playable 30s preview + HD artwork + release year on iTunes. Cached on disk. */
export async function resolveTrack(track: Track): Promise<Track> {
  const key = norm(`${track.artist} ${track.title}`);
  const hit = cache[key];
  const fresh = hit && Date.now() - hit.at < 1000 * 60 * 60 * 24 * 7;
  if (fresh) return merge(track, hit);
  try {
    const country = track.genre === 'thai' ? 'TH' : 'US';
    const url = `https://itunes.apple.com/search?media=music&entity=song&limit=8&country=${country}&term=${encodeURIComponent(
      `${track.artist} ${track.title}`,
    )}`;
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) throw new Error(`itunes ${res.status}`);
    const json = (await res.json()) as { results: any[] };
    const wantArtist = norm(track.artist).split(' ')[0] ?? '';
    const wantTitle = norm(track.title);
    const best =
      json.results.find((r) => norm(r.artistName ?? '').includes(wantArtist) && norm(r.trackName ?? '').includes(wantTitle)) ??
      json.results.find((r) => norm(r.artistName ?? '').includes(wantArtist)) ??
      json.results[0];
    const entry: CacheEntry = {
      at: Date.now(),
      previewUrl: best?.previewUrl,
      artwork: best?.artworkUrl100?.replace('100x100bb', '600x600bb'),
      year: best?.releaseDate ? new Date(best.releaseDate).getFullYear() : undefined,
    };
    cache[key] = entry;
    persistCache();
    return merge(track, entry);
  } catch {
    return track; // client falls back to the procedural synth
  }
}

function merge(track: Track, e: CacheEntry): Track {
  return {
    ...track,
    previewUrl: track.previewUrl || e.previewUrl,
    artwork: track.artwork || e.artwork,
    year: track.year || e.year || 0,
  };
}

export async function resolveAll(tracks: Track[], onProgress?: (p: number) => void): Promise<Track[]> {
  const out: Track[] = new Array(tracks.length);
  let done = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < tracks.length) {
      const i = cursor++;
      out[i] = await resolveTrack(tracks[i]);
      done++;
      onProgress?.(done / tracks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, tracks.length) }, worker));
  return out;
}

// ───────── Spotify playlist importer (public playlists via the embed page) ─────────
export function parseSpotifyId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/playlist[/:]([A-Za-z0-9]{10,40})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{16,40}$/.test(s)) return s;
  return null;
}

export async function importSpotifyPlaylist(input: string, token?: string): Promise<{ name: string; cover?: string; tracks: Track[] }> {
  const id = parseSpotifyId(input);
  if (!id) throw new Error('invalidPlaylist');

  // If token is provided and not a mock demo token, try Spotify Web API first (supports private/collaborative playlists)
  if (token && !token.startsWith('mock_')) {
    try {
      const apiRes = await fetchWithTimeout(`https://api.spotify.com/v1/playlists/${id}`, 8000, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        const list: any[] = data?.tracks?.items ?? [];
        const cover = data?.images?.[0]?.url;
        const tracks: Track[] = list
          .filter((item: any) => item?.track?.name && item?.track?.artists?.length)
          .slice(0, 100)
          .map((item: any, i: number) => {
            const t = item.track;
            const artistNames = (t.artists || []).map((a: any) => a.name).join(', ');
            let year = 0;
            if (t.album?.release_date) {
              const y = parseInt(t.album.release_date.slice(0, 4), 10);
              if (!isNaN(y)) year = y;
            }
            return {
              id: `sp-${id}-${i}`,
              title: String(t.name),
              artist: artistNames,
              year,
              genre: 'custom' as const,
              previewUrl: t.preview_url || undefined,
              artwork: t.album?.images?.[0]?.url || cover,
            };
          });

        if (tracks.length > 0) {
          return {
            name: data?.name || 'Spotify Playlist',
            cover,
            tracks,
          };
        }
      }
    } catch (err) {
      console.warn('[Spotify Web API Fetch Fallback]', err);
    }
  }

  // Fallback: Embed scraper for public playlists
  const res = await fetchWithTimeout(`https://open.spotify.com/embed/playlist/${id}`, 8000, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!res.ok) throw new Error('playlistFetchFailed');
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('playlistFetchFailed');
  const data = JSON.parse(m[1]);
  const entity = data?.props?.pageProps?.state?.data?.entity;
  const list: any[] = entity?.trackList ?? [];
  if (!list.length) throw new Error('playlistEmpty');
  const cover: string | undefined =
    entity?.coverArt?.sources?.sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0))?.[0]?.url ?? entity?.images?.[0]?.url;
  const tracks: Track[] = list
    .filter((t) => t?.title && t?.subtitle)
    .slice(0, 100)
    .map((t, i) => ({
      id: `sp-${id}-${i}`,
      title: String(t.title),
      artist: String(t.subtitle).split(',')[0].trim(),
      year: 0,
      genre: 'custom' as const,
      previewUrl: t.audioPreview?.url || undefined,
    }));
  return { name: entity?.name ?? entity?.title ?? 'Spotify Playlist', cover, tracks };
}

// ───────── Preview proxy allow-list (same-origin audio so the Web Audio analyser works) ─────────
const ALLOWED_HOSTS = [/\.mzstatic\.com$/, /\.itunes\.apple\.com$/, /\.apple\.com$/, /\.scdn\.co$/, /\.spotifycdn\.com$/];
export function isAllowedPreview(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && ALLOWED_HOSTS.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}
export { fetchWithTimeout };
