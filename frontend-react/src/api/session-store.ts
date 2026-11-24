import type { Api, SessionView } from './api';
import type { Realtime } from './realtime';
import type { TokenStore } from './token-store';

export interface SessionStore {
  session(): SessionView | null;
  enter(sessionId: string): void;
  leave(): void;
  serverNow(): number;
  subscribe(listener: () => void): () => void;
}

interface Entry {
  disconnect: (() => void) | null;
}

export function createSessionStore(
  api: Api,
  realtime: Realtime,
  tokens: TokenStore,
  now: () => number,
): SessionStore {
  const listeners = new Set<() => void>();
  let snapshot: SessionView | null = null;
  let offset = 0;
  let entry: Entry | null = null;

  const set = (next: SessionView | null) => {
    if (next !== snapshot) {
      snapshot = next;
      listeners.forEach((listener) => listener());
    }
  };

  const apply = (view: SessionView) => {
    const serverTime = Date.parse(view.serverTime);
    offset = Number.isNaN(serverTime) ? 0 : serverTime - now();
    set(view);
  };

  const leave = () => {
    entry?.disconnect?.();
    entry = null;
    set(null);
  };

  return {
    session: () => snapshot,
    enter(sessionId) {
      leave();
      const identity = tokens.identity(sessionId);
      if (identity === null) {
        return;
      }
      const current: Entry = { disconnect: null };
      entry = current;
      const end = () => {
        if (entry === current) {
          entry = null;
          set(null);
        }
      };
      api.getSession(sessionId).then((view) => {
        if (entry !== current) {
          return;
        }
        apply(view);
        current.disconnect = realtime.connect(sessionId, identity.token, apply, end);
      }, end);
    },
    leave,
    serverNow: () => now() + offset,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
