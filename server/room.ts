import { WebSocket } from 'ws';
import { CARDS, CARD_IDS, MODES, MODE_IDS, streakMultiplier } from '../shared/game';
import type {
  AskType, CardId, ClientMsg, FeedEvent, GenreId, PlayerRoundResult, PrivateState, PublicPlayer,
  QuestionType, RevealInfo, RoomSettings, RoomState, RoundPublic, ServerMsg, Track, Phase, PlaylistInfo,
  GlobalEvent, ChallengeState,
} from '../shared/types';
import { ALL_TRACKS, CATALOG } from './catalog';
import { importSpotifyPlaylist, resolveAll } from './music';
import { addEntries } from './leaderboard';

const MAX_PLAYERS = 8;
const DRAFT_MS = 20000;
const GENRE_IDS: GenreId[] = ['pop', 'rock', 'hiphop', 'kpop', 'edm', 'synthwave', 'thai', 'custom'];
const Q_TYPES: QuestionType[] = ['title', 'artist', 'year', 'mixed'];
const BOT_NAMES = ['DJ Byte', 'Synthia', 'Beat Bot', 'Lo-Fi Lynx', 'Riff Raptor', 'MC Glitch', 'Bass Panda', 'Auto-Tuna'];
const BOT_AVATARS = ['🤖', '🦄', '🥁', '🦊', '🎸', '👾', '🐼', '🐙'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const uid = () => Math.random().toString(36).slice(2, 10);
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

interface Player extends PublicPlayer {
  ws: WebSocket | null;
  priv: PrivateState;
  pending: PlayerRoundResult | null;
  leechTargets: string[];
  botSkill: number;
  dropTimer?: NodeJS.Timeout;
}

function freshPriv(): PrivateState {
  return {
    draftOptions: [], removed: [], effects: [], deadline: 0, totalTime: 0,
    warp: false, clarity: false, doubleDown: false, shield: false, castsThisRound: 0, myChoice: null,
  };
}

export class Room {
  code: string;
  hostId = '';
  phase: Phase = 'lobby';
  settings: RoomSettings = {
    mode: 'classic', genre: 'pop', genres: ['pop'], questionType: 'mixed', questionTypes: ['title', 'artist', 'year'], rounds: 10, timeLimit: 10, cardsEnabled: true, disabledCards: [],
  };
  players = new Map<string, Player>();
  tracks: Track[] = [];
  pool: Track[] = [];
  round?: RoundPublic;
  correctIndex = 0;
  reveal?: RevealInfo;
  phaseEndsAt?: number;
  playlist?: { info: PlaylistInfo; tracks: Track[] };
  feed: FeedEvent[] = [];
  loadingProgress = 0;
  private timers: NodeJS.Timeout[] = [];
  private tick?: NodeJS.Timeout;
  private emptyTimer?: NodeJS.Timeout;
  private broadcastQueued = false;

  constructor(code: string, private onDispose: (code: string) => void) {
    this.code = code;
  }

  // ───────── membership ─────────
  get humans() {
    return [...this.players.values()].filter((p) => !p.isBot);
  }
  get size() {
    return this.players.size;
  }

  addPlayer(ws: WebSocket | null, name: string, avatar: string, isBot = false): Player {
    const p: Player = {
      id: uid(), name: (name || 'Player').slice(0, 18), avatar: avatar || '🎧', isHost: false, isBot, connected: true,
      score: 0, streak: 0, bestStreak: 0, correct: 0, answeredCount: 0, totalSpeedMs: 0, mana: 0, hand: [],
      hasAnswered: false, drafted: false, ws, priv: freshPriv(), pending: null, leechTargets: [],
      botSkill: rand(0.5, 0.78),
    };
    if (!this.hostId && !isBot) this.hostId = p.id;
    this.players.set(p.id, p);
    this.pushFeed({ kind: 'join', from: p.id });
    if (this.emptyTimer) clearTimeout(this.emptyTimer);
    return p;
  }

  reattach(p: Player, ws: WebSocket) {
    if (p.dropTimer) clearTimeout(p.dropTimer);
    p.ws = ws;
    p.connected = true;
    if (!this.hostId || !this.players.get(this.hostId)?.connected) {
      this.hostId = p.id;
    }
    if (this.emptyTimer) clearTimeout(this.emptyTimer);
    this.queueBroadcast();
  }

  disconnect(p: Player) {
    p.ws = null;
    p.connected = false;
    const grace = this.phase === 'lobby' ? 15000 : 120000;
    p.dropTimer = setTimeout(() => this.removePlayer(p.id), grace);
    this.ensureHost();
    this.checkEmpty();
    this.queueBroadcast();
  }

  removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.dropTimer) clearTimeout(p.dropTimer);
    this.players.delete(id);
    this.pushFeed({ kind: 'leave', from: id, value: 0 });
    this.ensureHost();
    this.checkEmpty();
    if (this.phase === 'draft') this.maybeFinishDraft();
    this.queueBroadcast();
  }

  private ensureHost() {
    const host = this.players.get(this.hostId);
    if (host && host.connected) return;
    const next = this.humans.find((h) => h.connected);
    if (next) this.hostId = next.id;
  }

  private checkEmpty() {
    if (this.humans.some((h) => h.connected)) return;
    if (this.emptyTimer) clearTimeout(this.emptyTimer);
    this.emptyTimer = setTimeout(() => {
      if (!this.humans.some((h) => h.connected)) this.dispose();
    }, 60000);
  }

  dispose() {
    this.clearTimers();
    if (this.tick) clearInterval(this.tick);
    this.players.forEach((p) => p.dropTimer && clearTimeout(p.dropTimer));
    this.onDispose(this.code);
  }

  // ───────── messaging ─────────
  send(p: Player, msg: ServerMsg) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(JSON.stringify(msg));
  }
  sendAll(msg: ServerMsg) {
    this.players.forEach((p) => this.send(p, msg));
  }
  toast(p: Player, key: string, level: 'info' | 'error' | 'success' = 'error', params?: Record<string, string | number>) {
    this.send(p, { t: 'toast', key, level, params });
  }

  queueBroadcast() {
    if (this.broadcastQueued) return;
    this.broadcastQueued = true;
    setImmediate(() => {
      this.broadcastQueued = false;
      this.broadcast();
    });
  }

  private broadcast() {
    const now = Date.now();
    const players = [...this.players.values()].map((p) => this.pub(p));
    this.players.forEach((p) => {
      if (!p.ws) return;
      const state: RoomState = {
        code: this.code, hostId: this.hostId, phase: this.phase, settings: this.settings, players,
        round: this.round, reveal: this.reveal, phaseEndsAt: this.phaseEndsAt, playlist: this.playlist?.info,
        feed: this.feed.slice(-14), serverNow: now, me: p.priv, loadingProgress: this.loadingProgress,
      };
      this.send(p, { t: 'state', state });
    });
  }

  private pub(p: Player): PublicPlayer {
    const { ws, priv, pending, leechTargets, botSkill, dropTimer, ...rest } = p;
    return { ...rest, isHost: p.id === this.hostId };
  }

  private pushFeed(e: Omit<FeedEvent, 'id' | 'at'>) {
    this.feed.push({ id: uid(), at: Date.now(), ...e });
    if (this.feed.length > 40) this.feed.splice(0, this.feed.length - 40);
  }

  // ───────── message router ─────────
  async handle(p: Player, msg: ClientMsg) {
    const isHost = p.id === this.hostId || this.humans.length <= 1;
    if (isHost && this.hostId !== p.id) {
      this.hostId = p.id;
    }
    switch (msg.t) {
      case 'settings':
        if (!isHost || this.phase !== 'lobby') return;
        this.applySettings(msg.patch);
        break;
      case 'addBot': {
        if (!isHost || this.phase !== 'lobby') return;
        if (this.size >= MAX_PLAYERS) return this.toast(p, 'roomFull');
        const n = [...this.players.values()].filter((x) => x.isBot).length;
        this.addPlayer(null, `${BOT_NAMES[n % BOT_NAMES.length]}`, BOT_AVATARS[n % BOT_AVATARS.length], true);
        break;
      }
      case 'kick': {
        if (!isHost || msg.id === p.id) return;
        const target = this.players.get(msg.id);
        if (!target) return;
        this.send(target, { t: 'left' });
        target.ws?.close();
        this.removePlayer(target.id);
        break;
      }
      case 'start':
        if (!isHost || (this.phase !== 'lobby' && this.phase !== 'results')) return;
        void this.start();
        return;
      case 'draftPick':
        this.draftPick(p, msg.cards);
        break;
      case 'answer':
        this.answer(p, msg.choice, msg.micBonus ?? 0);
        break;
      case 'cast':
        this.cast(p, msg.card, msg.target);
        break;
      case 'importPlaylist': {
        if (!isHost || this.phase !== 'lobby') return;
        try {
          const pl = await importSpotifyPlaylist(msg.url);
          this.playlist = { info: { name: pl.name, cover: pl.cover, count: pl.tracks.length }, tracks: pl.tracks };
          this.settings.genre = 'custom';
          this.toast(p, 'playlistImported', 'success', { count: pl.tracks.length, name: pl.name });
        } catch (e: any) {
          const key = ['invalidPlaylist', 'playlistEmpty', 'playlistFetchFailed'].includes(e?.message) ? e.message : 'playlistFetchFailed';
          this.toast(p, key);
        }
        break;
      }
      case 'clearPlaylist': {
        if (!isHost || this.phase !== 'lobby') return;
        this.playlist = undefined;
        if (this.settings.genre === 'custom') {
          this.settings.genre = 'pop';
          this.settings.genres = ['pop'];
        }
        this.toast(p, 'playlistCleared', 'info');
        break;
      }
      case 'acceptChallenge': {
        if (!p.priv.challenge) break;
        if (msg.accept) {
          p.priv.challenge = {
            active: true,
            accepted: true,
            currentStreak: 0,
            targetStreak: 3,
            status: 'in_progress',
          };
          this.pushFeed({
            kind: 'challenge_accept',
            from: p.id,
            text: `${p.name} accepted the Ascension Challenge!`,
          });
        } else {
          p.priv.challenge = {
            active: false,
            accepted: false,
            currentStreak: 0,
            targetStreak: 3,
            status: 'failed',
          };
        }
        break;
      }
      case 'rematch':
        if (!isHost) return;
        this.clearTimers();
        if (this.tick) clearInterval(this.tick);
        this.resetToLobby();
        break;
      case 'playAgain':
        if (!isHost || this.phase !== 'results') return;
        this.resetToLobby();
        break;
      default:
        return;
    }
    this.queueBroadcast();
  }

  private applySettings(patch: Partial<RoomSettings>) {
    const s = { ...this.settings };
    if (patch.mode && MODE_IDS.includes(patch.mode)) s.mode = patch.mode;
    if (Array.isArray(patch.genres)) {
      const valid = patch.genres.filter((g) => GENRE_IDS.includes(g) && (g !== 'custom' || this.playlist));
      if (valid.length > 0) {
        s.genres = valid;
        s.genre = valid[0];
      }
    } else if (patch.genre && GENRE_IDS.includes(patch.genre) && (patch.genre !== 'custom' || this.playlist)) {
      s.genre = patch.genre;
      s.genres = [patch.genre];
    }
    if (Array.isArray(patch.questionTypes)) {
      const valid = patch.questionTypes.filter((qt): qt is AskType => ['title', 'artist', 'year'].includes(qt));
      if (valid.length > 0) {
        s.questionTypes = valid;
        s.questionType = valid.length === 3 ? 'mixed' : (valid[0] as QuestionType);
      }
    } else if (patch.questionType && Q_TYPES.includes(patch.questionType)) {
      s.questionType = patch.questionType;
      s.questionTypes = patch.questionType === 'mixed' ? ['title', 'artist', 'year'] : [patch.questionType];
    }
    if (typeof patch.rounds === 'number') s.rounds = Math.max(3, Math.min(30, Math.round(patch.rounds)));
    if (typeof patch.timeLimit === 'number') s.timeLimit = Math.max(5, Math.min(60, Math.round(patch.timeLimit)));
    if (typeof patch.cardsEnabled === 'boolean') s.cardsEnabled = patch.cardsEnabled;
    if (Array.isArray(patch.disabledCards))
      s.disabledCards = patch.disabledCards.filter((c) => CARD_IDS.includes(c)).slice(0, CARD_IDS.length - 3);
    this.settings = s;
  }

  private resetToLobby() {
    this.clearTimers();
    if (this.tick) clearInterval(this.tick);
    this.phase = 'lobby';
    this.round = undefined;
    this.reveal = undefined;
    this.phaseEndsAt = undefined;
    this.players.forEach((p) => {
      Object.assign(p, {
        score: 0, streak: 0, bestStreak: 0, correct: 0, answeredCount: 0, totalSpeedMs: 0, mana: 0, hand: [],
        hasAnswered: false, drafted: false, priv: freshPriv(), pending: null, leechTargets: [],
      });
    });
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
  private after(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, Math.max(0, ms)));
  }

  // ───────── match flow ─────────
  private pickTracks(): Track[] {
    const { mode, genre, genres } = this.settings;
    let pool: Track[] = [];
    const activeGenres = genres && genres.length > 0 ? genres : [genre];

    if (activeGenres.includes('custom') && this.playlist) {
      pool.push(...this.playlist.tracks);
    }
    if (mode === 'decade') {
      pool = ALL_TRACKS.filter((t) => t.year >= 1980);
    } else {
      for (const g of activeGenres) {
        if (g !== 'custom' && CATALOG[g]) {
          pool.push(...CATALOG[g]);
        }
      }
      if (pool.length === 0) pool = CATALOG.pop;
    }
    this.pool = pool;
    const rounds = Math.min(this.settings.rounds, pool.length);

    if (mode === 'decade' && !activeGenres.includes('custom')) {
      const groups = new Map<number, Track[]>();
      shuffle(pool).forEach((t) => {
        const d = Math.floor(t.year / 10) * 10;
        groups.set(d, [...(groups.get(d) ?? []), t]);
      });
      const decades = [...groups.keys()].sort();
      const picked: Track[] = [];
      while (picked.length < rounds) {
        let added = false;
        for (const d of decades) {
          const g = groups.get(d)!;
          if (g.length && picked.length < rounds) {
            picked.push(g.pop()!);
            added = true;
          }
        }
        if (!added) break;
      }
      return picked.sort((a, b) => a.year - b.year);
    }
    return shuffle(pool).slice(0, rounds);
  }

  async start() {
    this.resetToLobby();
    this.phase = 'loading';
    this.loadingProgress = 0;
    this.queueBroadcast();
    const picked = this.pickTracks();
    let lastSent = 0;
    this.tracks = await resolveAll(picked, (prog) => {
      this.loadingProgress = prog;
      if (Date.now() - lastSent > 200) {
        lastSent = Date.now();
        this.queueBroadcast();
      }
    });
    if (this.phase !== 'loading') return;
    if (this.settings.mode === 'event') {
      this.distributeEventCards();
      this.beginRound(0);
    } else if (this.settings.cardsEnabled && this.enabledCards().length >= 3) {
      this.beginDraft();
    } else {
      this.beginRound(0);
    }
  }

  private distributeEventCards() {
    const enabled = this.enabledCards();
    const mode = MODES[this.settings.mode];
    this.players.forEach((p) => {
      const randomCards = shuffle(enabled).slice(0, 3);
      p.hand = randomCards.map((id) => ({ id, cooldown: 0 }));
      p.drafted = true;
      p.mana = mode.startMana;
    });
  }

  private giftRandomCard(p: Player) {
    if (p.hand.length >= 3) return;
    const enabled = this.enabledCards();
    const current = p.hand.map((h) => h.id);
    const pool = enabled.filter((c) => !current.includes(c));
    if (pool.length > 0) {
      const card = shuffle(pool)[0];
      p.hand.push({ id: card, cooldown: 0 });
    }
  }

  private enabledCards(): CardId[] {
    return CARD_IDS.filter((c) => !this.settings.disabledCards.includes(c));
  }

  private beginDraft() {
    this.clearTimers();
    this.phase = 'draft';
    const enabled = this.enabledCards();
    this.players.forEach((p) => {
      let options = shuffle(enabled).slice(0, 5);
      if (this.settings.mode === 'decade' && enabled.includes('radar') && !options.includes('radar')) options[0] = 'radar';
      if (this.settings.mode === 'mayhem' && enabled.includes('clarity') && !options.includes('clarity')) options[4 % options.length] = 'clarity';
      options = shuffle(options);
      p.priv.draftOptions = options;
      p.drafted = false;
      p.hand = [];
      if (p.isBot) this.after(rand(1200, 4500), () => this.draftPick(p, shuffle(options).slice(0, 3)));
    });
    this.phaseEndsAt = Date.now() + DRAFT_MS;
    this.after(DRAFT_MS, () => this.finishDraft());
    this.queueBroadcast();
  }

  private draftPick(p: Player, cards: CardId[]) {
    if (this.phase !== 'draft' || p.drafted) return;
    const need = Math.min(3, p.priv.draftOptions.length);
    const uniq = [...new Set(cards)].filter((c) => p.priv.draftOptions.includes(c));
    if (uniq.length !== need) return;
    p.hand = uniq.map((id) => ({ id, cooldown: 0 }));
    p.drafted = true;
    this.maybeFinishDraft();
    this.queueBroadcast();
  }

  private maybeFinishDraft() {
    if ([...this.players.values()].every((p) => p.drafted || (!p.isBot && !p.connected))) {
      this.clearTimers();
      this.after(900, () => this.finishDraft());
    }
  }

  private finishDraft() {
    if (this.phase !== 'draft') return;
    const mode = MODES[this.settings.mode];
    this.players.forEach((p) => {
      if (!p.drafted) {
        p.hand = p.priv.draftOptions.slice(0, 3).map((id) => ({ id, cooldown: 0 }));
        p.drafted = true;
      }
      p.mana = mode.startMana;
    });
    this.beginRound(0);
  }

  private buildQuestion(track: Track): { ask: AskType; choices: string[]; correctIndex: number } {
    const { mode, questionType } = this.settings;
    let ask: AskType;
    if (mode === 'decade') ask = 'year';
    else if (mode === 'mic') ask = 'title';
    else if (this.settings.questionTypes && this.settings.questionTypes.length > 0) {
      ask = shuffle(this.settings.questionTypes)[0];
    } else if (questionType === 'mixed') ask = shuffle<AskType>(['title', 'artist', 'year'])[0];
    else ask = questionType;
    if (ask === 'year' && !track.year) ask = 'title';

    let correct: string;
    let wrong: string[];
    if (ask === 'year') {
      correct = String(track.year);
      const maxYear = new Date().getFullYear();
      const offsets = shuffle([-7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7]);
      const set = new Set<number>();
      for (const o of offsets) {
        const y = track.year + o;
        if (y >= 1950 && y <= maxYear) set.add(y);
        if (set.size === 3) break;
      }
      wrong = [...set].map(String);
    } else {
      const field = (t: Track) => (ask === 'title' ? t.title : t.artist);
      correct = field(track);
      const seen = new Set([norm(correct)]);
      const candidates = [...shuffle(this.pool), ...shuffle(CATALOG[track.genre] ?? []), ...shuffle(ALL_TRACKS)];
      wrong = [];
      for (const t of candidates) {
        const v = field(t);
        if (!seen.has(norm(v))) {
          seen.add(norm(v));
          wrong.push(v);
        }
        if (wrong.length === 3) break;
      }
    }
    const choices = shuffle([correct, ...wrong]);
    return { ask, choices, correctIndex: choices.indexOf(correct) };
  }

  private beginRound(i: number) {
    this.clearTimers();
    if (this.tick) clearInterval(this.tick);
    const track = this.tracks[i];
    if (!track) return this.finish();
    const mode = MODES[this.settings.mode];
    const q = this.buildQuestion(track);
    this.correctIndex = q.correctIndex;
    let duration = (mode.fixedTime ?? this.settings.timeLimit) * 1000;
    const countdown = this.settings.mode === 'blitz' && i > 0 ? 700 : mode.countdownMs;
    const startAt = Date.now() + countdown;

    let globalEvent: GlobalEvent | undefined;
    if (this.settings.mode === 'event') {
      const eventTypes: GlobalEvent[] = [
        { type: 'highRisk', title: 'The Ascension Challenge', description: 'Answer 3 in a row correctly to soar to 1st place! 1 wrong drops you straight to dead last!', icon: '⚡' },
        { type: 'blackout', title: 'Stage Blackout', description: 'Total stage blackout! Answer choices hidden for the first 3.5 seconds!', icon: '🌑' },
        { type: 'doubleTrouble', title: 'Double Stakes', description: 'Double points on correct answers, but -300 pts penalty on incorrect answers!', icon: '💥' },
        { type: 'tempoSurge', title: 'Tempo Surge', description: 'Hyperspeed audio! The timer countdown runs 30% faster this round!', icon: '⏩' },
        { type: 'giftDrop', title: 'Tactical Air Drop', description: 'Mystery card drop! Free ability cards distributed to all players (max 3)!', icon: '🎁' },
        { type: 'earthquake', title: 'Subwoofer Earthquake', description: 'Massive bass tremors shake everyone’s screen!', icon: '🌋' },
      ];
      // Offer events in Event Mode
      if (i === 1 || Math.random() < 0.65) {
        globalEvent = shuffle(eventTypes)[0];
      }
    }

    if (globalEvent?.type === 'tempoSurge') {
      duration = Math.round(duration * 0.7);
    }
    if (globalEvent?.type === 'giftDrop') {
      this.players.forEach((p) => this.giftRandomCard(p));
    }
    if (globalEvent?.type === 'highRisk') {
      this.players.forEach((p) => {
        if (!p.priv.challenge || (!p.priv.challenge.active && p.priv.challenge.status !== 'succeeded')) {
          p.priv.challenge = { active: false, accepted: false, currentStreak: 0, targetStreak: 3, status: 'pending' };
          if (p.isBot && Math.random() < 0.65) {
            p.priv.challenge = { active: true, accepted: true, currentStreak: 0, targetStreak: 3, status: 'in_progress' };
          }
        }
      });
    }

    this.round = {
      index: i, total: this.tracks.length, ask: q.ask, choices: q.choices, previewUrl: track.previewUrl,
      synthSeed: Math.floor(Math.random() * 1e9),
      previewOffset: Math.floor(this.settings.mode === 'blitz' ? rand(2, 22) : rand(0, 12)),
      startAt, duration,
      era: this.settings.mode === 'decade' && track.year ? `${Math.floor(track.year / 10) * 10}s` : undefined,
      globalEvent,
    };
    if (globalEvent) {
      this.pushFeed({ kind: 'global_event', text: `🌐 EVENT: ${globalEvent.title} — ${globalEvent.description}` });
    }

    this.reveal = undefined;
    this.players.forEach((p) => {
      const prevChallenge = (p.priv.challenge?.active && p.priv.challenge.accepted)
        ? p.priv.challenge
        : p.priv.challenge?.status === 'pending'
        ? p.priv.challenge
        : undefined;
      p.priv = { ...freshPriv(), draftOptions: p.priv.draftOptions, deadline: startAt + duration, totalTime: duration, challenge: prevChallenge };
      p.hasAnswered = false;
      p.pending = null;
      p.leechTargets = [];
    });
    this.phase = 'countdown';
    this.phaseEndsAt = startAt;
    this.after(countdown, () => this.openAnswers());
    this.queueBroadcast();
  }

  private openAnswers() {
    this.phase = 'playing';
    this.phaseEndsAt = undefined;
    const round = this.round!;
    this.players.forEach((p) => p.isBot && this.scheduleBot(p, round));
    this.tick = setInterval(() => this.checkRoundEnd(), 120);
    this.queueBroadcast();
  }

  private checkRoundEnd() {
    if (this.phase !== 'playing') return;
    const now = Date.now();
    const done = [...this.players.values()].every(
      (p) => p.hasAnswered || now > p.priv.deadline + 250 || (!p.isBot && !p.connected),
    );
    if (done) this.doReveal();
  }

  private answer(p: Player, choice: number, micBonus: number) {
    if (this.phase !== 'playing' || p.hasAnswered || !this.round) return;
    const now = Date.now();
    if (p.priv.frozenUntil && now < p.priv.frozenUntil) {
      return this.toast(p, 'cardFrozen');
    }
    if (now > p.priv.deadline + 400) return;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
    const mode = MODES[this.settings.mode];
    const correct = choice === this.correctIndex;
    const remaining = Math.max(0, Math.min(p.priv.totalTime, p.priv.deadline - now));
    const speedBonus = Math.round((1000 * remaining) / p.priv.totalTime);
    let multiplier = correct ? streakMultiplier(p.streak + 1, this.settings.mode) : 1;
    if (p.priv.frenzy && correct) multiplier = mode.streakCap;
    const mic = correct && this.settings.mode === 'mic' ? Math.max(0, Math.min(500, Math.round(micBonus))) : 0;
    let points = correct ? Math.round((1000 + speedBonus) * multiplier) : 0;
    if (correct && p.priv.doubleDown) points *= 2;
    if (correct && this.round?.globalEvent?.type === 'doubleTrouble') points *= 2;
    points += mic;
    p.pending = {
      choice, correct, points, speedMs: now - this.round.startAt, stolen: 0, gained: 0,
      multiplier, doubled: correct && p.priv.doubleDown, micBonus: mic,
    };
    p.hasAnswered = true;
    p.priv.myChoice = choice;
    void mode;
    this.checkRoundEnd();
    this.queueBroadcast();
  }

  private doReveal() {
    if (this.tick) clearInterval(this.tick);
    this.clearTimers();
    const mode = MODES[this.settings.mode];
    const results: Record<string, PlayerRoundResult> = {};
    this.players.forEach((p) => {
      const r: PlayerRoundResult = p.pending ?? {
        choice: null, correct: false, points: 0, speedMs: 0, stolen: 0, gained: 0, multiplier: 1, doubled: false, micBonus: 0,
      };
      if (r.choice !== null) {
        p.answeredCount++;
        p.totalSpeedMs += r.speedMs;
      }
      if (r.correct) {
        p.score += r.points;
        p.streak++;
        p.correct++;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
        if (p.streak >= 3) this.pushFeed({ kind: 'streak', from: p.id, value: p.streak });
      } else {
        p.streak = 0;
        if (this.round?.globalEvent?.type === 'doubleTrouble') {
          p.score = Math.max(0, p.score - 300);
        }
      }

      // Check Ascension Challenge
      if (p.priv.challenge?.active && p.priv.challenge.accepted) {
        if (r.correct) {
          p.priv.challenge.currentStreak++;
          if (p.priv.challenge.currentStreak >= 3) {
            // SUCCESS: jump directly to 1st place!
            const highestOther = Math.max(0, ...[...this.players.values()].filter((x) => x.id !== p.id).map((x) => x.score));
            p.score = Math.max(p.score, highestOther + 300);
            p.priv.challenge.status = 'succeeded';
            p.priv.challenge.active = false;
            this.pushFeed({
              kind: 'challenge_success',
              from: p.id,
              text: `👑 ${p.name} completed the Ascension Challenge (3/3) and jumped directly to 1st Place!`,
            });
            this.toast(p, 'challengeWon', 'success', { name: p.name });
          } else {
            this.pushFeed({
              kind: 'challenge_accept',
              from: p.id,
              text: `🔥 ${p.name}'s Ascension Challenge: ${p.priv.challenge.currentStreak}/3 correct!`,
            });
          }
        } else {
          // FAILURE: drops straight to the last position!
          const lowestOther = Math.min(...[...this.players.values()].filter((x) => x.id !== p.id).map((x) => x.score), p.score);
          p.score = Math.max(0, lowestOther - 300);
          p.priv.challenge.status = 'failed';
          p.priv.challenge.active = false;
          this.pushFeed({
            kind: 'challenge_fail',
            from: p.id,
            text: `💀 ${p.name} failed the Ascension Challenge and dropped straight to Dead Last!`,
          });
          this.toast(p, 'challengeLost', 'error', { name: p.name });
        }
      }

      results[p.id] = r;
    });
    // Parasite Leech resolves after base scoring.
    this.players.forEach((p) => {
      if (!results[p.id]?.correct) return;
      p.leechTargets.forEach((tid) => {
        const t = this.players.get(tid);
        if (!t) return;
        const steal = Math.min(450, t.score);
        t.score -= steal;
        p.score += steal;
        results[p.id].gained += steal;
        if (results[tid]) results[tid].stolen += steal;
      });
    });
    this.players.forEach((p) => {
      p.mana = Math.min(mode.maxMana, p.mana + mode.manaRegen);
      p.hand = p.hand.map((h) => ({ ...h, cooldown: Math.max(0, h.cooldown - 1) }));
    });
    const track = this.tracks[this.round!.index];
    this.reveal = { correctIndex: this.correctIndex, track, results };
    this.phase = 'reveal';
    this.phaseEndsAt = Date.now() + mode.revealMs;
    const next = this.round!.index + 1;
    this.after(mode.revealMs, () => (next < this.tracks.length ? this.beginRound(next) : this.finish()));
    this.queueBroadcast();
  }

  private finish() {
    this.clearTimers();
    if (this.tick) clearInterval(this.tick);
    this.phase = 'results';
    this.phaseEndsAt = undefined;
    const total = this.tracks.length || 1;
    addEntries(
      this.humans
        .filter((h) => h.answeredCount > 0)
        .map((h) => ({
          id: uid(), name: h.name, avatar: h.avatar, score: h.score, accuracy: h.correct / total,
          avgSpeedMs: h.answeredCount ? Math.round(h.totalSpeedMs / h.answeredCount) : 0,
          genre: this.settings.genre, mode: this.settings.mode, rounds: total, date: Date.now(),
        })),
    );
    this.queueBroadcast();
  }

  // ───────── ability cards ─────────
  private cast(p: Player, cardId: CardId, target: string | 'all') {
    if (this.phase !== 'playing' || !this.settings.cardsEnabled) return;
    const def = CARDS[cardId];
    const mode = MODES[this.settings.mode];
    const slot = p.hand.find((h) => h.id === cardId);
    if (!def || !slot) return;
    if (slot.cooldown > 0) return this.toast(p, 'cardCooldown');
    if (p.mana < def.cost) return this.toast(p, 'notEnoughMana');
    if (p.priv.castsThisRound >= mode.maxCastsPerRound) return this.toast(p, 'castLimit');
    if (def.kind === 'buff' && p.hasAnswered) return this.toast(p, 'alreadyAnswered');

    let targets: Player[] = [];
    if (def.kind === 'sabotage') {
      targets = target === 'all' ? [...this.players.values()].filter((x) => x.id !== p.id) : [this.players.get(target)!].filter(Boolean);
      targets = targets.filter((t) => t.id !== p.id);
      if (!targets.length) return this.toast(p, 'noTarget');
    }

    p.mana -= def.cost;
    slot.cooldown = mode.cooldown;
    p.priv.castsThisRound++;
    const now = Date.now();
    const blocked: string[] = [];

    switch (cardId) {
      case 'purge': {
        const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== this.correctIndex && !p.priv.removed.includes(i)));
        p.priv.removed.push(...wrong.slice(0, 2));
        break;
      }
      case 'heist':
        p.priv.deadline += 5000;
        p.priv.totalTime += 5000;
        break;
      case 'warp': {
        if (!p.priv.warp) {
          const remaining = Math.max(0, p.priv.deadline - now);
          const add = remaining / 0.6 - remaining;
          p.priv.deadline += add;
          p.priv.totalTime += add;
          p.priv.warp = true;
        }
        break;
      }
      case 'double':
        p.priv.doubleDown = true;
        break;
      case 'clarity':
        p.priv.clarity = true;
        p.priv.effects = p.priv.effects.filter((e) => e.card === 'leech');
        if (this.settings.mode === 'mayhem') p.priv.shield = true;
        break;
      case 'radar': {
        const y = this.tracks[this.round!.index]?.year ?? 0;
        const lo = y ? y - Math.floor(rand(0, 4)) : 0;
        p.priv.radar = { decade: y ? `${Math.floor(y / 10) * 10}s` : '??', range: [lo, lo + 4] };
        break;
      }
      case 'shield':
        p.priv.shield = true;
        break;
      case 'frenzy':
        p.priv.frenzy = true;
        break;
      case 'freeze':
        targets.forEach((t) => {
          if (t.priv.shield) return blocked.push(t.id);
          t.priv.frozenUntil = Date.now() + 3500;
          t.priv.effects.push({ uid: uid(), card: 'freeze', from: p.id, seed: Math.floor(Math.random() * 1e6) });
        });
        break;
      case 'smoke':
        targets.forEach((t) => {
          if (t.priv.shield) return blocked.push(t.id);
          t.priv.effects.push({ uid: uid(), card: 'smoke', from: p.id, seed: Math.floor(Math.random() * 1e6) });
        });
        break;
      default:
        targets.forEach((t) => {
          if (t.priv.shield) return blocked.push(t.id);
          if (cardId === 'leech' && !p.leechTargets.includes(t.id)) p.leechTargets.push(t.id);
          t.priv.effects.push({ uid: uid(), card: cardId, from: p.id, seed: Math.floor(Math.random() * 1e6) });
        });
    }

    if (def.kind === 'sabotage') {
      const hit = targets.filter((t) => !blocked.includes(t.id));
      hit.forEach((t) => this.pushFeed({ kind: 'sabotage', from: p.id, to: t.id, card: cardId }));
      blocked.forEach((id) => this.pushFeed({ kind: 'blocked', from: p.id, to: id, card: cardId }));
      this.sendAll({ t: 'fx', card: cardId, from: p.id, to: hit.map((t) => t.id), blocked });
    } else {
      this.pushFeed({ kind: 'cast', from: p.id, card: cardId });
      this.sendAll({ t: 'fx', card: cardId, from: p.id, to: [p.id], blocked: [] });
    }
    this.queueBroadcast();
  }

  // ───────── bots ─────────
  private scheduleBot(bot: Player, round: RoundPublic) {
    const dur = round.duration;
    const castable = bot.hand.filter((h) => h.cooldown === 0 && CARDS[h.id].cost <= bot.mana);
    if (this.settings.cardsEnabled && castable.length && Math.random() < 0.5) {
      const card = shuffle(castable)[0].id;
      const humans = [...this.players.values()].filter((x) => x.id !== bot.id && !x.isBot);
      const others = [...this.players.values()].filter((x) => x.id !== bot.id);
      const target = shuffle(humans.length ? humans : others)[0];
      this.after(dur * rand(0.05, 0.25), () => {
        if (this.phase === 'playing' && (CARDS[card].kind === 'buff' || target)) this.cast(bot, card, target?.id ?? 'all');
      });
    }
    this.after(dur * rand(0.3, 0.9), () => {
      if (this.phase !== 'playing' || bot.hasAnswered) return;
      const correct = Math.random() < bot.botSkill + (bot.priv.removed.length ? 0.15 : 0);
      const wrong = [0, 1, 2, 3].filter((i) => i !== this.correctIndex && !bot.priv.removed.includes(i));
      this.answer(bot, correct ? this.correctIndex : shuffle(wrong)[0], rand(150, 450));
    });
  }
}
