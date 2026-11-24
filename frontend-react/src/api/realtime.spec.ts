import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from './api';
import { ApiError } from './api-error';
import { createErrorState } from './error-state';
import { lobbyDeveloper, votingDeveloper } from './examples';
import { createRealtime, sessionSocketUrl } from './realtime';
import type { Clock } from './realtime';
import { createFakeSocketFactory } from './testing/fake-web-socket';

const ID = 'K7P2QX9M';
const TOKEN = 'token-of-ben';
const START = Date.parse('2026-11-24T10:00:00.000Z');

const clock: Clock = {
  now: () => Date.now(),
  setTimeout: (handler, delayMs) => setTimeout(handler, delayMs),
  clearTimeout: (timer) => clearTimeout(timer as number),
  setInterval: (handler, delayMs) => setInterval(handler, delayMs),
  clearInterval: (timer) => clearInterval(timer as number),
};

function setup(location = { protocol: 'http:', host: 'localhost:4300' }) {
  const sockets = createFakeSocketFactory();
  const errors = createErrorState();
  const realtime = createRealtime({ createSocket: sockets.create, location, clock }, errors);
  const snapshots: SessionView[] = [];
  const onEnd = vi.fn();
  const connect = () => realtime.connect(ID, TOKEN, (view) => snapshots.push(view), onEnd);
  return { sockets, errors, realtime, snapshots, onEnd, connect };
}

function snapshot(payload: SessionView) {
  return { type: 'session.state', payload } as const;
}

describe('realtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connection', () => {
    it.each([
      { protocol: 'http:', host: 'localhost:4300', url: `ws://localhost:4300/ws/sessions/${ID}` },
      { protocol: 'https:', host: 'poker.example', url: `wss://poker.example/ws/sessions/${ID}` },
    ])('opens $url for the protocol $protocol', ({ protocol, host, url }) => {
      const { sockets, connect } = setup({ protocol, host });

      connect();

      expect(sockets.sockets).toHaveLength(1);
      expect(sockets.last().url).toBe(url);
    });

    it('encodes the session id in the URL', () => {
      expect(sessionSocketUrl({ protocol: 'https:', host: 'h' }, 'a/b')).toBe(
        'wss://h/ws/sessions/a%2Fb',
      );
    });

    it('sends auth with the token as the first message once the socket is open', () => {
      const { sockets, connect } = setup();
      connect();
      expect(sockets.last().sent).toEqual([]);

      sockets.last().open();

      expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: TOKEN } }]);
      expect(sockets.last().url).not.toContain(TOKEN);
    });

    it('sends ping every 30 s', () => {
      const { sockets, connect } = setup();
      connect();
      sockets.last().open();

      vi.advanceTimersByTime(29_999);
      expect(sockets.last().sent).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(sockets.last().sent.at(-1)).toEqual({ type: 'ping' });
      vi.advanceTimersByTime(60_000);

      expect(sockets.last().sent.filter((message) => message.type === 'ping')).toHaveLength(3);
    });

    it('delivers every snapshot and ignores pong', () => {
      const { sockets, snapshots, connect } = setup();
      connect();
      sockets.last().open();

      sockets.last().receive(snapshot(lobbyDeveloper));
      sockets.last().receive({ type: 'pong' });
      sockets.last().receive(snapshot(votingDeveloper));

      expect(snapshots).toEqual([lobbyDeveloper, votingDeveloper]);
    });

    it('keeps the last message round.allVoted and reports the change', () => {
      const { sockets, realtime, snapshots, connect } = setup();
      const listener = vi.fn();
      realtime.subscribe(listener);
      connect();
      sockets.last().open();
      expect(realtime.allVoted()).toBeNull();

      sockets.last().receive({ type: 'round.allVoted', payload: { roundNumber: 1 } });
      sockets.last().receive({ type: 'round.allVoted', payload: { roundNumber: 2 } });

      expect(realtime.allVoted()).toEqual({ roundNumber: 2 });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(snapshots).toEqual([]);
    });
  });

  describe('reconnect', () => {
    it('waits 1, 2, 4, 8, 16 and then 30 s each before the next attempt', () => {
      const { sockets, realtime, connect } = setup();
      connect();

      for (const delay of [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]) {
        const opened = sockets.sockets.length;
        sockets.last().drop();

        expect(realtime.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + delay });
        vi.advanceTimersByTime(delay - 1);
        expect(sockets.sockets).toHaveLength(opened);
        vi.advanceTimersByTime(1);
        expect(sockets.sockets).toHaveLength(opened + 1);
        expect(realtime.connection()).toEqual({ status: 'CONNECTING' });
      }
    });

    it('is OPEN at first, WAITING after a loss, CONNECTING at the attempt and OPEN after a snapshot', () => {
      const { sockets, realtime, connect } = setup();
      const states: string[] = [];
      realtime.subscribe(() => states.push(realtime.connection().status));
      expect(realtime.connection()).toEqual({ status: 'OPEN' });
      connect();
      sockets.last().open();
      sockets.last().receive(snapshot(lobbyDeveloper));

      sockets.last().drop();
      vi.advanceTimersByTime(1_000);
      sockets.last().open();
      expect(realtime.connection()).toEqual({ status: 'CONNECTING' });
      sockets.last().receive(snapshot(lobbyDeveloper));

      expect(realtime.connection()).toEqual({ status: 'OPEN' });
      expect(states).toEqual(['WAITING', 'CONNECTING', 'OPEN']);
    });

    it('sends auth again on the new socket and closes the lost one', () => {
      const { sockets, connect } = setup();
      connect();
      const first = sockets.last();
      first.open();

      first.drop();
      vi.advanceTimersByTime(1_000);
      sockets.last().open();

      expect(first.closed()).toBe(true);
      expect(sockets.last()).not.toBe(first);
      expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: TOKEN } }]);
      vi.advanceTimersByTime(30_000);
      expect(first.sent).toHaveLength(1);
      expect(sockets.last().sent).toHaveLength(2);
    });

    it('starts the sequence again after a snapshot', () => {
      const { sockets, realtime, connect } = setup();
      connect();
      sockets.last().drop();
      vi.advanceTimersByTime(1_000);
      sockets.last().drop();
      expect(realtime.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + 2_000 });
      vi.advanceTimersByTime(2_000);

      sockets.last().receive(snapshot(lobbyDeveloper));
      sockets.last().drop();

      expect(realtime.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + 1_000 });
    });

    it('does not start the sequence again after another message', () => {
      const { sockets, realtime, connect } = setup();
      connect();
      sockets.last().drop();
      vi.advanceTimersByTime(1_000);

      sockets.last().receive({ type: 'pong' });
      sockets.last().drop();

      expect(realtime.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + 2_000 });
    });

    it('connects at once with reconnectNow and makes no second attempt at the old time', () => {
      const { sockets, realtime, connect } = setup();
      connect();
      sockets.last().drop();
      vi.advanceTimersByTime(1_000);
      sockets.last().drop();
      expect(sockets.sockets).toHaveLength(2);

      realtime.reconnectNow();

      expect(sockets.sockets).toHaveLength(3);
      expect(realtime.connection()).toEqual({ status: 'CONNECTING' });
      vi.advanceTimersByTime(2_000);
      expect(sockets.sockets).toHaveLength(3);
    });

    it.each(['OPEN', 'CONNECTING'])('opens no socket with reconnectNow while %s', (status) => {
      const { sockets, realtime, connect } = setup();
      connect();
      if (status === 'CONNECTING') {
        sockets.last().drop();
        vi.advanceTimersByTime(1_000);
      }
      const opened = sockets.sockets.length;
      expect(realtime.connection().status).toBe(status);

      realtime.reconnectNow();

      expect(sockets.sockets).toHaveLength(opened);
    });

    it.each([
      { name: 'no JSON', data: '{not json' },
      { name: 'JSON without a type', data: '{"payload":{}}' },
      { name: 'an error without a payload', data: '{"type":"error"}' },
      { name: 'a snapshot with the payload null', data: '{"type":"session.state","payload":null}' },
    ])('treats a message that is $name like a lost connection', ({ data }) => {
      const { sockets, errors, realtime, snapshots, connect } = setup();
      connect();
      sockets.last().open();

      sockets.last().receiveText(data);

      expect(snapshots).toEqual([]);
      expect(errors.error()).toBeNull();
      expect(sockets.last().closed()).toBe(true);
      expect(realtime.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + 1_000 });
    });
  });

  describe('end', () => {
    it('reports an ApiError for a message error and ends without a new attempt', () => {
      const { sockets, errors, realtime, onEnd, connect } = setup();
      connect();
      const socket = sockets.last();
      socket.open();

      socket.receive({
        type: 'error',
        payload: { errorCode: 'SESSION_NOT_FOUND', detail: 'Unknown session.' },
      });
      socket.drop();
      vi.advanceTimersByTime(120_000);

      const error = errors.error();
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        errorCode: 'SESSION_NOT_FOUND',
        status: null,
        detail: 'Unknown session.',
      });
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(socket.closed()).toBe(true);
      expect(sockets.sockets).toHaveLength(1);
      expect(socket.sent).toHaveLength(1);
      expect(realtime.connection()).toEqual({ status: 'OPEN' });
    });

    it('closes the socket and stops the ping when the caller ends the connection', () => {
      const { sockets, realtime, snapshots, onEnd, connect } = setup();
      const disconnect = connect();
      const socket = sockets.last();
      socket.open();

      disconnect();
      socket.receive(snapshot(lobbyDeveloper));
      socket.drop();
      vi.advanceTimersByTime(120_000);

      expect(socket.closed()).toBe(true);
      expect(socket.sent).toHaveLength(1);
      expect(sockets.sockets).toHaveLength(1);
      expect(snapshots).toEqual([]);
      expect(onEnd).not.toHaveBeenCalled();
      expect(realtime.connection()).toEqual({ status: 'OPEN' });
    });

    it('stops the attempts when the caller ends the connection while it waits', () => {
      const { sockets, realtime, connect } = setup();
      const disconnect = connect();
      sockets.last().drop();
      expect(realtime.connection().status).toBe('WAITING');

      disconnect();
      vi.advanceTimersByTime(120_000);
      realtime.reconnectNow();

      expect(sockets.sockets).toHaveLength(1);
      expect(realtime.connection()).toEqual({ status: 'OPEN' });
    });

    it('ends the first connection when the caller connects again', () => {
      const { sockets, snapshots, connect } = setup();
      connect();
      const first = sockets.last();
      first.open();

      connect();
      first.receive(snapshot(lobbyDeveloper));

      expect(first.closed()).toBe(true);
      expect(sockets.sockets).toHaveLength(2);
      expect(snapshots).toEqual([]);
    });
  });
});
