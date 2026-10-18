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
      json.results.find((r) => norm(r.trackName ?? '').includes(wantTitle)) ??
      json.results.find((r) => norm(r.artistName ?? '').includes(wantArtist));

    if (!best) {
      return track;
    }

    const entry: CacheEntry = {
      at: Date.now(),
      previewUrl: best.previewUrl,
      artwork: best.artworkUrl100?.replace('100x100bb', '600x600bb'),
      year: best.releaseDate ? new Date(best.releaseDate).getFullYear() : undefined,
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

// ───────── Spotify playlist / album importer (public playlists via the embed page) ─────────
export function parseSpotifyId(input: string): { type: 'playlist' | 'album'; id: string } | null {
  const s = input.trim();
  const mPl = s.match(/(?:intl-[a-z]{2,5}\/)?playlist[/:]([A-Za-z0-9]{10,40})/);
  if (mPl) return { type: 'playlist', id: mPl[1] };
  const mAlb = s.match(/(?:intl-[a-z]{2,5}\/)?album[/:]([A-Za-z0-9]{10,40})/);
  if (mAlb) return { type: 'album', id: mAlb[1] };
  if (/^[A-Za-z0-9]{16,40}$/.test(s)) return { type: 'playlist', id: s };
  return null;
}

export async function importSpotifyPlaylist(input: string): Promise<{ name: string; cover?: string; tracks: Track[] }> {
  const parsed = parseSpotifyId(input);
  if (!parsed) throw new Error('invalidPlaylist');
  const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
  const res = await fetchWithTimeout(embedUrl, 8000, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9,th;q=0.8' },
  });
  if (!res.ok) throw new Error('playlistFetchFailed');
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('playlistFetchFailed');
  const data = JSON.parse(m[1]);
  if (data?.props?.pageProps?.status === 404) {
    throw new Error('playlistEmpty');
  }
  const entity = data?.props?.pageProps?.state?.data?.entity;
  const list: any[] = entity?.trackList ?? [];
  if (!list.length) throw new Error('playlistEmpty');
  const cover: string | undefined =
    entity?.coverArt?.sources?.sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0))?.[0]?.url ?? entity?.images?.[0]?.url;
  const tracks: Track[] = list
    .filter((t) => t?.title && t?.subtitle)
    .slice(0, 100)
    .map((t, i) => ({
      id: `sp-${parsed.id}-${i}`,
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
