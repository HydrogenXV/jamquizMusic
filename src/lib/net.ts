import { useSyncExternalStore } from 'react';
import type { ClientMsg, RoomState, ServerMsg, CardId } from '../../shared/types';

export interface Toast {
  id: number;
  level: 'info' | 'error' | 'success';
  key: string;
  params?: Record<string, string | number>;
}
export interface FxEvent {
  id: number;
  card: CardId;
  from: string;
  to: string[];
  blocked: string[];
}

interface Snapshot {
  connected: boolean;
  you: string | null;
  room: RoomState | null;
  clockOffset: number; // serverNow - Date.now()
  toasts: Toast[];
  lastFx: FxEvent | null;
}

type Listener = () => void;
const SESSION_KEY = 'sq.session';

export function getApiUrl(path: string): string {
  const customWs = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? localStorage.getItem('sq.ws.url') : null);
  if (customWs) {
    try {
      const u = new URL(customWs);
      const httpProto = u.protocol === 'wss:' ? 'https:' : 'http:';
      return `${httpProto}//${u.host}${path}`;
    } catch {}
  }
  return path;
}

class GameClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retry = 0;
  private toastId = 0;
  private pendingQueue: ClientMsg[] = [];
  private fxListeners = new Set<(fx: FxEvent) => void>();
  snap: Snapshot = { connected: false, you: null, room: null, clockOffset: 0, toasts: [], lastFx: null };

  constructor() {
    this.connect();
  }

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  private connect() {
    const customWs = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? localStorage.getItem('sq.ws.url') : null);
    let wsUrl: string;
    if (customWs) {
      wsUrl = customWs;
    } else {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      wsUrl = `${proto}://${location.host}/ws`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      ws.onerror = () => {
        this.set({ connected: false });
      };
    ws.onopen = () => {
      this.retry = 0;
      this.set({ connected: true });
      const sess = sessionStorage.getItem(SESSION_KEY);
      if (sess) {
        try {
          const { code, id } = JSON.parse(sess);
          ws.send(JSON.stringify({ t: 'resume', code, id } satisfies ClientMsg));
        } catch {}
      }
      this.pendingQueue.splice(0).forEach((m) => ws.send(JSON.stringify(m)));
    };
    ws.onclose = () => {
      this.set({ connected: false });
      const delay = Math.min(5000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as ServerMsg;
        this.onMessage(msg);
      };
    } catch (err) {
      this.set({ connected: false });
      const delay = Math.min(5000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    }
  }

  private onMessage(msg: ServerMsg) {
    switch (msg.t) {
      case 'welcome':
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code: msg.code, id: msg.you }));
        this.set({ you: msg.you });
        break;
      case 'state':
        this.set({ room: msg.state, clockOffset: msg.state.serverNow - Date.now() });
        break;
      case 'fx': {
        const fx: FxEvent = { id: ++this.toastId, card: msg.card, from: msg.from, to: msg.to, blocked: msg.blocked };
        this.set({ lastFx: fx });
        this.fxListeners.forEach((l) => l(fx));
        break;
      }
      case 'toast':
        this.toast(msg.key, msg.level, msg.params);
        break;
      case 'left':
        sessionStorage.removeItem(SESSION_KEY);
        this.set({ room: null, you: null });
        break;
    }
  }

  toast(key: string, level: Toast['level'] = 'info', params?: Toast['params']) {
    const t: Toast = { id: ++this.toastId, key, level, params };
    this.set({ toasts: [...this.snap.toasts.slice(-3), t] });
    setTimeout(() => this.set({ toasts: this.snap.toasts.filter((x) => x.id !== t.id) }), 3800);
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.pendingQueue.push(msg);
  }

  onFx(fn: (fx: FxEvent) => void) {
    this.fxListeners.add(fn);
    return () => this.fxListeners.delete(fn);
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.snap;

  /** Server-synchronised timestamp. */
  now() {
    return Date.now() + this.snap.clockOffset;
  }
}

export const client = new GameClient();

export function useGame() {
  return useSyncExternalStore(client.subscribe, client.getSnapshot);
}
