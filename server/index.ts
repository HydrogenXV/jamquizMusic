import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMsg, ServerMsg } from '../shared/types';
import { MODE_IDS, MODES } from '../shared/game';
import { Room } from './room';
import { queryLeaderboard, type SortKey } from './leaderboard';
import { fetchWithTimeout, isAllowedPreview } from './music';

const PORT = Number(process.env.PORT) || 3001;
const app = express();
app.use(express.json({ limit: '100kb' }));

// CORS for cross-subdomain access (e.g. jam.hxvapp.com -> ws.hxvapp.com)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const rooms = new Map<string, Room>();

function newCode(): string {
  for (;;) {
    const code = `SPOTI-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!rooms.has(code)) return code;
  }
}
function normalizeCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const digits = s.replace(/^SPOTI/, '');
  return `SPOTI-${digits}`;
}

// ───────── REST ─────────
app.get('/api/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

app.get('/api/leaderboard', (req, res) => {
  const sort = (['score', 'accuracy', 'speed'].includes(String(req.query.sort)) ? req.query.sort : 'score') as SortKey;
  res.json(queryLeaderboard(String(req.query.genre ?? 'all'), sort));
});

/** Streams a 30s preview through our origin so the browser's Web Audio analyser can read it (CORS-safe). */
app.get('/api/preview', async (req, res) => {
  const url = String(req.query.url ?? '');
  if (!isAllowedPreview(url)) return res.status(400).end();
  try {
    const headers: Record<string, string> = {};
    if (req.headers.range) headers.Range = String(req.headers.range);
    const upstream = await fetchWithTimeout(url, 10000, { headers });
    res.status(upstream.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch {
    if (!res.headersSent) res.status(502).end();
  }
});

// Production: serve the built SPA.
const dist = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res, next) => (req.path.startsWith('/api') ? next() : res.sendFile(path.join(dist, 'index.html'))));
}

// ───────── WebSocket ─────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket & { alive?: boolean }) => {
  ws.alive = true;
  ws.on('pong', () => (ws.alive = true));
  let room: Room | null = null;
  let playerId: string | null = null;

  const send = (msg: ServerMsg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
  const toast = (key: string) => send({ t: 'toast', level: 'error', key });

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg.t === 'ping') return send({ t: 'pong' });

    if (msg.t === 'create') {
      if (room && playerId) room.removePlayer(playerId);
      const code = newCode();
      room = new Room(code, (c) => rooms.delete(c));
      rooms.set(code, room);
      if (msg.mode && MODE_IDS.includes(msg.mode)) {
        room.settings.mode = msg.mode;
        room.settings.rounds = MODES[msg.mode].defaultRounds;
      }
      const p = room.addPlayer(ws, msg.name, msg.avatar);
      playerId = p.id;
      send({ t: 'welcome', you: p.id, code });
      room.queueBroadcast();
      return;
    }
    if (msg.t === 'join') {
      const target = rooms.get(normalizeCode(msg.code));
      if (!target) return toast('roomNotFound');
      if (target.phase !== 'lobby') return toast('gameInProgress');
      if (target.size >= 8) return toast('roomFull');
      if (room && playerId) room.removePlayer(playerId);
      room = target;
      const p = room.addPlayer(ws, msg.name, msg.avatar);
      playerId = p.id;
      send({ t: 'welcome', you: p.id, code: room.code });
      room.queueBroadcast();
      return;
    }
    if (msg.t === 'resume') {
      const target = rooms.get(msg.code);
      const p = target?.players.get(msg.id);
      if (!target || !p) return send({ t: 'left' });
      room = target;
      playerId = p.id;
      room.reattach(p, ws);
      send({ t: 'welcome', you: p.id, code: room.code });
      return;
    }
    if (!room || !playerId) return;
    const p = room.players.get(playerId);
    if (!p) return send({ t: 'left' });
    if (msg.t === 'leave') {
      room.removePlayer(playerId);
      room = null;
      playerId = null;
      return send({ t: 'left' });
    }
    void room.handle(p, msg);
  });

  ws.on('close', () => {
    const p = room && playerId ? room.players.get(playerId) : undefined;
    if (room && p && p.ws === ws) room.disconnect(p);
  });
});

setInterval(() => {
  wss.clients.forEach((c) => {
    const ws = c as WebSocket & { alive?: boolean };
    if (ws.alive === false) return ws.terminate();
    ws.alive = false;
    ws.ping();
  });
}, 20000);

server.listen(PORT, () => console.log(`🎧 SpotiQuiz server on http://localhost:${PORT}`));
