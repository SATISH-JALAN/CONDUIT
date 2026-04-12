import type { Anchor } from './formula';

type WSMessageHandler = (msg: WSMessage) => void;

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') return Number.parseFloat(v);
  return NaN;
}

/** Server `publishWalletEvent` sends snake_case anchor fields. */
export function parseAnchorUpdatePayload(data: unknown): Anchor | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const box_id = typeof o.box_id === 'string' ? o.box_id : null;
  if (!box_id) return null;
  const principal = num(o.principal);
  const apy_bps = num(o.apy_bps);
  const sync_ts = num(o.sync_ts);
  if (!Number.isFinite(principal) || !Number.isFinite(apy_bps) || !Number.isFinite(sync_ts)) {
    return null;
  }
  return { box_id, principal, apy_bps, sync_ts };
}

/** Payload for server `publishWalletEvent(..., { type: 'COND_ACTION', data })` (internal tx dry-run / notify). */
export type CondActionEventData = {
  action: string;
  reasoning: string;
  confidence: number;
};

export interface WSMessage {
  type: 'ANCHOR_UPDATE' | 'HARVEST_COMPLETE' | 'COND_ACTION' | 'APY_UPDATE';
  data: unknown;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
const TOKEN_PARAM = 'token';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 10000;
const handlers = new Set<WSMessageHandler>();

function getReconnectDelay(): number {
  return Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
}

/**
 * Close the current socket (if any) and open a new one using the latest session token.
 * Call after access token refresh so `/ws?token=` stays valid.
 */
export function reconnectWebSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (socket) {
    const s = socket;
    s.onclose = null;
    try {
      s.close();
    } catch {
      // ignore
    }
    socket = null;
  }
  connect();
}

/**
 * Connect to WebSocket server
 */
export function connect(wallet?: string): void {
  if (
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  ) {
    return;
  }

  // Production-ready: server authenticates WS via JWT token, not by trusting wallet query params.
  void wallet; // wallet identity is derived from JWT on the server side.
  const token = window.sessionStorage.getItem('conduit:access-token');
  const url = token ? `${WS_URL}/ws?${TOKEN_PARAM}=${encodeURIComponent(token)}` : `${WS_URL}/ws`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('[WS] Connected');
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);
      handlers.forEach((handler) => handler(msg));
    } catch {
      // ignore non-JSON messages (PONG etc)
    }
  };

  socket.onclose = () => {
    console.log('[WS] Disconnected');
    scheduleReconnect(wallet);
  };

  socket.onerror = (err) => {
    console.warn('[WS] Error', err);
  };
}

function scheduleReconnect(wallet?: string): void {
  if (reconnectTimer) return;
  const delay = getReconnectDelay();
  reconnectAttempts++;
  console.log(`[WS] Reconnecting in ${delay}ms...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(wallet);
  }, delay);
}

/**
 * Disconnect WebSocket
 */
export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onclose = null; // prevent reconnect
    socket.close();
    socket = null;
  }
}

/**
 * Subscribe to WebSocket messages
 */
export function onMessage(handler: WSMessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Send a message
 */
export function send(msg: any): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export const ws = { connect, disconnect, reconnectWebSocket, onMessage, send };
