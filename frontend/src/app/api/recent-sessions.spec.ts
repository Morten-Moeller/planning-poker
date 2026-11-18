import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  RECENT_SESSIONS_KEY,
  RecentSession,
  RecentSessions,
  loadRecentSessionsSetting,
} from './recent-sessions';

function entry(sessionId: string, changes: Partial<RecentSession> = {}): RecentSession {
  return {
    sessionId,
    participantId: `p-${sessionId}`,
    token: `token-${sessionId}`,
    role: 'SCRUM_MASTER',
    name: 'Anna',
    lastUsedAt: '2026-11-18T09:00:00.000Z',
    ...changes,
  };
}

describe('RecentSessions', () => {
  let recent: RecentSessions;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    recent = TestBed.inject(RecentSessions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns an empty list without a stored entry', () => {
    expect(recent.list()).toEqual([]);
  });

  it('keeps the newest entry first and at most five entries', () => {
    ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].forEach((id) => recent.save(entry(id)));

    expect(recent.list().map((e) => e.sessionId)).toEqual(['S6', 'S5', 'S4', 'S3', 'S2']);
  });

  it('moves a session to the front when it is saved again', () => {
    ['S1', 'S2', 'S3'].forEach((id) => recent.save(entry(id)));
    recent.save(entry('S1', { name: 'Ben', role: 'DEVELOPER' }));

    expect(recent.list().map((e) => [e.sessionId, e.name, e.role])).toEqual([
      ['S1', 'Ben', 'DEVELOPER'],
      ['S3', 'Anna', 'SCRUM_MASTER'],
      ['S2', 'Anna', 'SCRUM_MASTER'],
    ]);
  });

  it('keeps the role VIEWER', () => {
    recent.save(entry('S1', { name: 'Paula', role: 'VIEWER' }));

    expect(recent.list().map((e) => [e.sessionId, e.name, e.role])).toEqual([
      ['S1', 'Paula', 'VIEWER'],
    ]);
  });

  it('stores the entries as JSON under one key', () => {
    recent.save(entry('S1'));

    expect(JSON.parse(localStorage.getItem(RECENT_SESSIONS_KEY) ?? '')).toEqual([entry('S1')]);
  });

  it('finds an entry by session id', () => {
    recent.save(entry('S1'));

    expect(recent.find('S1')).toEqual(entry('S1'));
    expect(recent.find('S2')).toBeNull();
  });

  it('removes one entry and clears all entries', () => {
    ['S1', 'S2'].forEach((id) => recent.save(entry(id)));

    recent.remove('S1');
    expect(recent.list().map((e) => e.sessionId)).toEqual(['S2']);

    recent.clear();
    expect(recent.list()).toEqual([]);
    expect(localStorage.getItem(RECENT_SESSIONS_KEY)).toBeNull();
  });

  it.each([
    ['not json'],
    ['{"sessionId":"S1"}'],
    ['42'],
    [JSON.stringify([{ ...entry('S1'), role: 'ADMIN' }])],
    [JSON.stringify([{ ...entry('S1'), token: 7 }])],
    [JSON.stringify([{ ...entry('S1'), lastUsedAt: 'yesterday' }])],
    [JSON.stringify([entry('S1'), null])],
  ])('returns an empty list for the stored value %s', (raw) => {
    localStorage.setItem(RECENT_SESSIONS_KEY, raw);

    expect(recent.list()).toEqual([]);
  });

  it('returns only the known fields of an entry', () => {
    localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify([{ ...entry('S1'), extra: 'value' }]));

    expect(recent.list()).toEqual([entry('S1')]);
  });

  it('returns an empty list when localStorage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(recent.list()).toEqual([]);
  });

  it('ignores an exception of localStorage on write and on clear', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(() => recent.save(entry('S1'))).not.toThrow();
    expect(() => recent.clear()).not.toThrow();
    expect(recent.list()).toEqual([]);
  });

  describe('setting of the backend', () => {
    let http: HttpTestingController;

    beforeEach(() => {
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it.each([[true], [false]])('takes rememberSessions %s from GET /api/config', async (value) => {
      const loaded = TestBed.runInInjectionContext(() => loadRecentSessionsSetting());
      http.expectOne('/api/config').flush({ rememberSessions: value });
      await loaded;

      expect(recent.enabled()).toBe(value);
    });

    it('leaves the setting unknown when the call fails', async () => {
      const loaded = TestBed.runInInjectionContext(() => loadRecentSessionsSetting());
      http.expectOne('/api/config').flush('down', { status: 504, statusText: 'Gateway Timeout' });
      await loaded;

      expect(recent.enabled()).toBeNull();
    });
  });
});
