import fs from 'node:fs';
import path from 'node:path';
import type { GenreId, LeaderboardEntry, ModeId } from '../shared/types';

const FILE = path.resolve(process.cwd(), 'server', 'data', 'leaderboard.json');
fs.mkdirSync(path.dirname(FILE), { recursive: true });

function seed(): LeaderboardEntry[] {
  const bots: [string, string, number, number, number, GenreId, ModeId][] = [
    ['DJ Byte 🤖', '🤖', 17840, 0.9, 3100, 'pop', 'classic'],
    ['Synthia 🤖', '🦄', 16120, 0.8, 3550, 'synthwave', 'decade'],
    ['Beat Bot 🤖', '🥁', 14990, 0.8, 2900, 'edm', 'mayhem'],
    ['Lo-Fi Lynx 🤖', '🦊', 12650, 0.7, 4200, 'kpop', 'classic'],
    ['Riff Raptor 🤖', '🎸', 11980, 0.7, 3900, 'rock', 'classic'],
    ['MC Glitch 🤖', '👾', 9420, 0.6, 2400, 'hiphop', 'blitz'],
    ['Moo Deng 🤖', '🦛', 8700, 0.6, 4600, 'thai', 'mic'],
  ];
  return bots.map(([name, avatar, score, accuracy, avgSpeedMs, genre, mode], i) => ({
    id: `seed-${i}`,
    name,
    avatar,
    score,
    accuracy,
    avgSpeedMs,
    genre,
    mode,
    rounds: 10,
    date: Date.now() - i * 86400000,
  }));
}

let timer: NodeJS.Timeout | null = null;
let entries: LeaderboardEntry[] = [];

function save() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(entries, null, 1), () => {}), 500);
}

try {
  entries = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  entries = seed();
  save();
}

export function addEntries(list: LeaderboardEntry[]) {
  entries.push(...list);
  entries.sort((a, b) => b.score - a.score);
  entries = entries.slice(0, 500);
  save();
}

export type SortKey = 'score' | 'accuracy' | 'speed';
export function queryLeaderboard(genre: string | undefined, sort: SortKey, limit = 50): LeaderboardEntry[] {
  let list = genre && genre !== 'all' ? entries.filter((e) => e.genre === genre) : [...entries];
  if (sort === 'accuracy') list.sort((a, b) => b.accuracy - a.accuracy || b.score - a.score);
  else if (sort === 'speed') list = list.filter((e) => e.avgSpeedMs > 0).sort((a, b) => a.avgSpeedMs - b.avgSpeedMs);
  else list.sort((a, b) => b.score - a.score);
  return list.slice(0, limit);
}
