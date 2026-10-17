import type { CardId, Rarity, ModeId } from './types';

export interface CardDef {
  id: CardId;
  kind: 'buff' | 'sabotage';
  cost: number; // mana 1–3
  rarity: Rarity;
  hue: string; // primary accent colour
  hue2: string; // secondary accent colour
}

export const CARDS: Record<CardId, CardDef> = {
  purge:   { id: 'purge',   kind: 'buff',     cost: 2, rarity: 'rare',      hue: '#1ed760', hue2: '#0ea5e9' },
  heist:   { id: 'heist',   kind: 'buff',     cost: 1, rarity: 'tactical',  hue: '#facc15', hue2: '#f97316' },
  double:  { id: 'double',  kind: 'buff',     cost: 3, rarity: 'legendary', hue: '#f5d061', hue2: '#e879f9' },
  warp:    { id: 'warp',    kind: 'buff',     cost: 2, rarity: 'epic',      hue: '#818cf8', hue2: '#22d3ee' },
  clarity: { id: 'clarity', kind: 'buff',     cost: 1, rarity: 'tactical',  hue: '#67e8f9', hue2: '#a7f3d0' },
  radar:   { id: 'radar',   kind: 'buff',     cost: 1, rarity: 'rare',      hue: '#34d399', hue2: '#a3e635' },
  shield:  { id: 'shield',  kind: 'buff',     cost: 2, rarity: 'legendary', hue: '#38bdf8', hue2: '#6366f1' },
  frenzy:  { id: 'frenzy',  kind: 'buff',     cost: 2, rarity: 'epic',      hue: '#f43f5e', hue2: '#fb923c' },
  jumble:  { id: 'jumble',  kind: 'sabotage', cost: 1, rarity: 'tactical',  hue: '#fb923c', hue2: '#f43f5e' },
  ink:     { id: 'ink',     kind: 'sabotage', cost: 2, rarity: 'rare',      hue: '#a78bfa', hue2: '#1e1b4b' },
  vinyl:   { id: 'vinyl',   kind: 'sabotage', cost: 2, rarity: 'epic',      hue: '#f472b6', hue2: '#7c3aed' },
  captcha: { id: 'captcha', kind: 'sabotage', cost: 2, rarity: 'epic',      hue: '#fda4af', hue2: '#a8a29e' },
  leech:   { id: 'leech',   kind: 'sabotage', cost: 3, rarity: 'legendary', hue: '#84cc16', hue2: '#dc2626' },
  glitch:  { id: 'glitch',  kind: 'sabotage', cost: 1, rarity: 'rare',      hue: '#22d3ee', hue2: '#ec4899' },
  freeze:  { id: 'freeze',  kind: 'sabotage', cost: 2, rarity: 'epic',      hue: '#67e8f9', hue2: '#0284c7' },
  smoke:   { id: 'smoke',   kind: 'sabotage', cost: 2, rarity: 'rare',      hue: '#94a3b8', hue2: '#334155' },
};

export const CARD_IDS = Object.keys(CARDS) as CardId[];

export const RARITY_COLORS: Record<Rarity, string> = {
  tactical: '#94a3b8',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

export interface ModeDef {
  id: ModeId;
  icon: string;
  startMana: number;
  manaRegen: number;
  maxMana: number;
  cooldown: number;
  maxCastsPerRound: number;
  streakStep: number;
  streakCap: number;
  fixedTime?: number; // seconds, overrides settings
  revealMs: number;
  countdownMs: number;
  accent: string;
  defaultRounds: number;
}

export const MODES: Record<ModeId, ModeDef> = {
  classic: { id: 'classic', icon: '🎧', startMana: 3, manaRegen: 1, maxMana: 8,  cooldown: 2, maxCastsPerRound: 2,  streakStep: 0.1,  streakCap: 1.5, revealMs: 4200, countdownMs: 3000, accent: '#1db954', defaultRounds: 10 },
  mic:     { id: 'mic',     icon: '🎤', startMana: 3, manaRegen: 1, maxMana: 8,  cooldown: 2, maxCastsPerRound: 2,  streakStep: 0.1,  streakCap: 1.5, revealMs: 4200, countdownMs: 3000, accent: '#f472b6', defaultRounds: 8 },
  blitz:   { id: 'blitz',   icon: '⚡', startMana: 2, manaRegen: 1, maxMana: 5,  cooldown: 2, maxCastsPerRound: 1,  streakStep: 0.25, streakCap: 3.0, fixedTime: 3, revealMs: 1300, countdownMs: 1200, accent: '#facc15', defaultRounds: 10 },
  mayhem:  { id: 'mayhem',  icon: '🃏', startMana: 4, manaRegen: 2, maxMana: 12, cooldown: 1, maxCastsPerRound: 99, streakStep: 0.1,  streakCap: 1.5, revealMs: 4200, countdownMs: 3000, accent: '#a78bfa', defaultRounds: 10 },
  decade:  { id: 'decade',  icon: '🕰️', startMana: 3, manaRegen: 1, maxMana: 8,  cooldown: 2, maxCastsPerRound: 2,  streakStep: 0.1,  streakCap: 1.5, revealMs: 4200, countdownMs: 3000, accent: '#38bdf8', defaultRounds: 10 },
  event:   { id: 'event',   icon: '🎪', startMana: 4, manaRegen: 2, maxMana: 10, cooldown: 1, maxCastsPerRound: 3,  streakStep: 0.15, streakCap: 2.0, revealMs: 4200, countdownMs: 3000, accent: '#ec4899', defaultRounds: 10 },
};

export const MODE_IDS = Object.keys(MODES) as ModeId[];

export const GENRES = [
  { id: 'pop', icon: '🎤', grad: 'from-pink-500 to-rose-500' },
  { id: 'rock', icon: '🎸', grad: 'from-red-600 to-orange-500' },
  { id: 'hiphop', icon: '🎙️', grad: 'from-amber-500 to-yellow-600' },
  { id: 'kpop', icon: '💜', grad: 'from-fuchsia-500 to-violet-600' },
  { id: 'edm', icon: '🎛️', grad: 'from-cyan-400 to-blue-600' },
  { id: 'synthwave', icon: '🌆', grad: 'from-purple-600 to-pink-500' },
  { id: 'thai', icon: '🐘', grad: 'from-emerald-500 to-teal-600' },
] as const;

export const AVATARS = ['🎧', '🎸', '🎤', '🥁', '🎹', '🎷', '🦊', '🐼', '🐸', '🦄', '👾', '🤖', '🦛', '🐙', '🔥', '🌈'];

/** Streak multiplier: first correct answer = 1.0×, each consecutive one adds `step`, capped. */
export function streakMultiplier(streak: number, mode: ModeId): number {
  const m = MODES[mode];
  if (streak <= 1) return 1;
  return Math.min(m.streakCap, +(1 + m.streakStep * (streak - 1)).toFixed(2));
}
