// Shared domain types used by both the React client and the Express/WebSocket server.

export type Lang = 'en' | 'th' | 'ja' | 'es';
export type ModeId = 'classic' | 'mic' | 'blitz' | 'mayhem' | 'decade' | 'event';
export type QuestionType = 'title' | 'artist' | 'year' | 'mixed';
export type AskType = Exclude<QuestionType, 'mixed'>;
export type GenreId = 'pop' | 'rock' | 'hiphop' | 'kpop' | 'edm' | 'synthwave' | 'thai' | 'custom';
export type CardId =
  | 'purge' | 'heist' | 'double' | 'warp' | 'clarity' | 'radar'
  | 'jumble' | 'ink' | 'vinyl' | 'captcha' | 'leech' | 'glitch'
  | 'shield' | 'frenzy' | 'freeze' | 'smoke';
export type Rarity = 'tactical' | 'rare' | 'epic' | 'legendary';
export type Phase = 'lobby' | 'loading' | 'draft' | 'countdown' | 'playing' | 'reveal' | 'results';

export interface Track {
  id: string;
  title: string;
  artist: string;
  year: number; // 0 = unknown
  genre: GenreId;
  previewUrl?: string;
  artwork?: string;
}

export interface RoomSettings {
  mode: ModeId;
  genre: GenreId;
  genres?: GenreId[];
  questionType: QuestionType;
  questionTypes?: AskType[];
  rounds: number; // 3–30
  timeLimit: number; // seconds 5–60
  cardsEnabled: boolean;
  disabledCards: CardId[];
}

export interface HandCard {
  id: CardId;
  cooldown: number; // rounds remaining before it can be cast again
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answeredCount: number;
  totalSpeedMs: number;
  mana: number;
  hand: HandCard[];
  hasAnswered: boolean;
  drafted: boolean;
}

export interface ActiveEffect {
  uid: string;
  card: CardId;
  from: string;
  seed: number;
}

export type GlobalEventType = 'highRisk' | 'blackout' | 'doubleTrouble' | 'tempoSurge' | 'giftDrop' | 'earthquake';
export interface GlobalEvent {
  type: GlobalEventType;
  title: string;
  description: string;
  icon: string;
}

export interface ChallengeState {
  active: boolean;
  accepted: boolean;
  currentStreak: number;
  targetStreak: number;
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed';
}

export interface PrivateState {
  draftOptions: CardId[];
  removed: number[]; // choice indexes eliminated by 50/50 Purge
  radar?: { decade: string; range: [number, number] };
  effects: ActiveEffect[];
  deadline: number; // server timestamp
  totalTime: number; // ms
  warp: boolean;
  clarity: boolean;
  doubleDown: boolean;
  shield: boolean;
  frenzy?: boolean;
  frozenUntil?: number;
  castsThisRound: number;
  myChoice: number | null;
  challenge?: ChallengeState;
}

export interface RoundPublic {
  index: number; // 0-based
  total: number;
  ask: AskType;
  choices: string[];
  previewUrl?: string;
  synthSeed: number;
  previewOffset: number; // seconds into the preview to start
  startAt: number; // server timestamp when answering opens
  duration: number; // ms (base)
  era?: string; // Decade Time Machine label
  globalEvent?: GlobalEvent;
}

export interface PlayerRoundResult {
  choice: number | null;
  correct: boolean;
  points: number;
  speedMs: number;
  stolen: number; // points lost to leech
  gained: number; // points gained via leech
  multiplier: number;
  doubled: boolean;
  micBonus: number;
}

export interface RevealInfo {
  correctIndex: number;
  track: Track;
  results: Record<string, PlayerRoundResult>;
}

export type FeedKind = 'cast' | 'sabotage' | 'blocked' | 'join' | 'leave' | 'streak' | 'challenge_accept' | 'challenge_success' | 'challenge_fail' | 'global_event';
export interface FeedEvent {
  id: string;
  at: number;
  kind: FeedKind;
  from?: string;
  to?: string;
  card?: CardId;
  value?: number;
  text?: string;
}

export interface PlaylistInfo {
  name: string;
  cover?: string;
  count: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: Phase;
  settings: RoomSettings;
  players: PublicPlayer[];
  round?: RoundPublic;
  reveal?: RevealInfo;
  phaseEndsAt?: number;
  playlist?: PlaylistInfo;
  feed: FeedEvent[];
  serverNow: number;
  me?: PrivateState;
  loadingProgress?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
  accuracy: number; // 0..1
  avgSpeedMs: number;
  genre: GenreId;
  mode: ModeId;
  rounds: number;
  date: number;
}

// ───────── WebSocket protocol ─────────
export type ClientMsg =
  | { t: 'create'; name: string; avatar: string; mode?: ModeId }
  | { t: 'join'; code: string; name: string; avatar: string }
  | { t: 'resume'; code: string; id: string }
  | { t: 'settings'; patch: Partial<RoomSettings> }
  | { t: 'addBot' }
  | { t: 'kick'; id: string }
  | { t: 'start' }
  | { t: 'draftPick'; cards: CardId[] }
  | { t: 'answer'; choice: number; micBonus?: number }
  | { t: 'cast'; card: CardId; target: string | 'all' }
  | { t: 'importPlaylist'; url: string; token?: string }
  | { t: 'clearPlaylist' }
  | { t: 'acceptChallenge'; accept: boolean }
  | { t: 'playAgain' }
  | { t: 'rematch' }
  | { t: 'leave' }
  | { t: 'ping' };

export type ServerMsg =
  | { t: 'welcome'; you: string; code: string }
  | { t: 'state'; state: RoomState }
  | { t: 'fx'; card: CardId; from: string; to: string[]; blocked: string[] }
  | { t: 'toast'; level: 'info' | 'error' | 'success'; key: string; params?: Record<string, string | number> }
  | { t: 'left' }
  | { t: 'pong' };
