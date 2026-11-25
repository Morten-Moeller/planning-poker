import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { lobbyScrumMaster, votingDeveloper } from '../api/examples';
import type { ParticipantRole } from '../api/recent-sessions';
import { createTestBackend, problem, renderWithBackend } from '../api/testing/test-backend';
import type { FetchCall } from '../api/testing/test-backend';
import { RecentSessionsList } from './recent-sessions-list';

const STORED_AT = Date.parse('2026-11-24T10:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const FIRST = 'K7P2QX9M';
const SECOND = 'M3N8RT5W';

type Check = () => Response | Promise<Response>;

function view(sessionId: string, changes: Partial<SessionView> = {}): Check {
  return () => Response.json({ ...lobbyScrumMaster, sessionId, ...changes });
}

function sessionIdOf(call: FetchCall): string {
  return call.url.slice('/api/sessions/'.length);
}

async function setup(
  rememberSessions: boolean | null,
  checks: Record<string, Check> = {},
  entries: { sessionId: string; role?: ParticipantRole; name?: string }[] = [],
) {
  const test = createTestBackend((call) => {
    if (call.url === '/api/config') {
      return Response.json({ rememberSessions: true });
    }
    return (checks[sessionIdOf(call)] ?? (() => problem(404, 'SESSION_NOT_FOUND')))();
  });
  await test.backend.loadSetting();
  for (const [index, entry] of entries.entries()) {
    vi.setSystemTime(STORED_AT + index);
    test.backend.tokens.store(
      entry.sessionId,
      { participantId: `participant-${entry.sessionId}`, token: `token-${entry.sessionId}` },
      { role: entry.role ?? 'DEVELOPER', name: entry.name ?? 'Ben' },
    );
  }
  vi.setSystemTime(STORED_AT);
  if (rememberSessions === true) {
    return test;
  }
  const other = createTestBackend((call) =>
    call.url === '/api/config' && rememberSessions !== null
      ? Response.json({ rememberSessions })
      : problem(404, 'SESSION_NOT_FOUND'),
  );
  if (rememberSessions !== null) {
    await other.backend.loadSetting();
  }
  return other;
}

function sessionCalls(calls: FetchCall[]): FetchCall[] {
  return calls.filter((call) => call.url.startsWith('/api/sessions/'));
}

function textOf(row: HTMLElement, testId: string): string | null {
  return within(row).queryByTestId(testId)?.textContent ?? null;
}

describe('RecentSessionsList', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(STORED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('checks every entry with its token and shows the rows, newest first', async () => {
    const test = await setup(true, { [FIRST]: view(FIRST), [SECOND]: view(SECOND) }, [
      { sessionId: FIRST },
      { sessionId: SECOND },
    ]);

    renderWithBackend(<RecentSessionsList />, test.backend);

    const rows = await screen.findAllByTestId('recent-session');
    expect(screen.getByTestId('recent-sessions').tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Letzte Sitzungen');
    expect(rows.map((row) => textOf(row, 'recent-session-id'))).toEqual([SECOND, FIRST]);
    const checks = sessionCalls(test.calls);
    expect(checks.map((call) => `${call.method} ${call.url}`).sort()).toEqual([
      `GET /api/sessions/${FIRST}`,
      `GET /api/sessions/${SECOND}`,
    ]);
    expect(checks.map((call) => call.headers['Authorization']).sort()).toEqual([
      `Bearer token-${FIRST}`,
      `Bearer token-${SECOND}`,
    ]);
  });

  it('shows project, issue, role of the snapshot, name, id and time in a link to the room', async () => {
    const test = await setup(
      true,
      { [FIRST]: view(FIRST, { activeIssue: votingDeveloper.activeIssue }) },
      [{ sessionId: FIRST, role: 'DEVELOPER', name: 'Anna' }],
    );

    renderWithBackend(<RecentSessionsList />, test.backend);

    const row = await screen.findByTestId('recent-session');
    expect(textOf(row, 'recent-session-project')).toBe('Frontend');
    expect(textOf(row, 'recent-session-issue')).toBe('#42 Login page');
    expect(textOf(row, 'recent-session-role')).toBe('Scrum Master');
    expect(textOf(row, 'recent-session-name')).toBe('Anna');
    expect(textOf(row, 'recent-session-id')).toBe(FIRST);
    expect(textOf(row, 'recent-session-last-used')).toBe('zuletzt vor 1 Minute');
    const link = within(row).getByRole('link');
    expect(link.getAttribute('href')).toBe(`/session/${FIRST}`);
    expect(link.contains(within(row).getByTestId('recent-session-project'))).toBe(true);
    expect(link.contains(within(row).getByTestId('recent-session-last-used'))).toBe(true);
    expect(row.textContent).not.toContain(`token-${FIRST}`);
  });

  it('shows the project id without a project name and that no issue is active', async () => {
    const test = await setup(true, { [FIRST]: view(FIRST, { project: null, activeIssue: null }) }, [
      { sessionId: FIRST },
    ]);

    renderWithBackend(<RecentSessionsList />, test.backend);

    const row = await screen.findByTestId('recent-session');
    expect(textOf(row, 'recent-session-project')).toBe('1234');
    expect(textOf(row, 'recent-session-issue')).toBe('Kein Issue aktiv');
  });

  it.each<{ role: ParticipantRole; text: string }>([
    { role: 'SCRUM_MASTER', text: 'Scrum Master' },
    { role: 'DEVELOPER', text: 'Entwickler' },
    { role: 'VIEWER', text: 'Zuschauer' },
  ])('shows the role $role of the snapshot as "$text"', async ({ role, text }) => {
    const test = await setup(
      true,
      { [FIRST]: view(FIRST, { me: { ...lobbyScrumMaster.me, role } }) },
      [{ sessionId: FIRST, role: role === 'VIEWER' ? 'DEVELOPER' : 'VIEWER' }],
    );

    renderWithBackend(<RecentSessionsList />, test.backend);

    expect(textOf(await screen.findByTestId('recent-session'), 'recent-session-role')).toBe(text);
  });

  it.each([
    { name: 'SESSION_NOT_FOUND', answer: () => problem(404, 'SESSION_NOT_FOUND') },
    { name: 'UNAUTHORIZED', answer: () => problem(401, 'UNAUTHORIZED') },
  ])('removes an entry that answers $name from the token store', async ({ answer }) => {
    const test = await setup(true, { [FIRST]: answer, [SECOND]: view(SECOND) }, [
      { sessionId: FIRST },
      { sessionId: SECOND },
    ]);

    renderWithBackend(<RecentSessionsList />, test.backend);

    const rows = await screen.findAllByTestId('recent-session');
    expect(rows.map((row) => textOf(row, 'recent-session-id'))).toEqual([SECOND]);
    expect(test.backend.recent.list().map((entry) => entry.sessionId)).toEqual([SECOND]);
    expect(test.backend.tokens.identity(FIRST)).toBeNull();
    expect(test.backend.errors.error()).toBeNull();
  });

  it.each([
    { name: 'another error code', answer: () => problem(502, 'GITLAB_ERROR') },
    { name: 'a failed call', answer: () => Promise.reject(new TypeError('Failed to fetch')) },
  ])(
    'keeps an entry without project and issue after $name and shows the role of the entry',
    async ({ answer }) => {
      const test = await setup(true, { [FIRST]: answer }, [
        { sessionId: FIRST, role: 'VIEWER', name: 'Cem' },
      ]);

      renderWithBackend(<RecentSessionsList />, test.backend);

      const row = await screen.findByTestId('recent-session');
      expect(textOf(row, 'recent-session-project')).toBeNull();
      expect(textOf(row, 'recent-session-issue')).toBeNull();
      expect(textOf(row, 'recent-session-role')).toBe('Zuschauer');
      expect(textOf(row, 'recent-session-name')).toBe('Cem');
      expect(textOf(row, 'recent-session-id')).toBe(FIRST);
      expect(test.backend.recent.list().map((entry) => entry.sessionId)).toEqual([FIRST]);
      expect(test.backend.tokens.identity(FIRST)).not.toBeNull();
      expect(test.backend.errors.error()).toBeNull();
    },
  );

  it('shows no section when every entry is gone', async () => {
    const test = await setup(true, {}, [{ sessionId: FIRST }]);

    renderWithBackend(<RecentSessionsList />, test.backend);

    await waitFor(() => expect(test.backend.recent.list()).toEqual([]));
    expect(screen.queryByTestId('recent-sessions')).toBeNull();
    expect(test.backend.errors.error()).toBeNull();
  });

  it.each([
    { age: 0, text: 'zuletzt vor 1 Minute' },
    { age: MINUTE + 59_000, text: 'zuletzt vor 1 Minute' },
    { age: 2 * MINUTE, text: 'zuletzt vor 2 Minuten' },
    { age: 59 * MINUTE, text: 'zuletzt vor 59 Minuten' },
    { age: HOUR, text: 'zuletzt vor 1 Stunde' },
    { age: 23 * HOUR + 59 * MINUTE, text: 'zuletzt vor 23 Stunden' },
    { age: DAY, text: 'zuletzt vor 1 Tag' },
    { age: 3 * DAY, text: 'zuletzt vor 3 Tagen' },
  ])('shows "$text" for an entry used $age ms ago', async ({ age, text }) => {
    const test = await setup(true, { [FIRST]: view(FIRST) }, [{ sessionId: FIRST }]);
    vi.setSystemTime(STORED_AT + age);

    renderWithBackend(<RecentSessionsList />, test.backend);

    expect(textOf(await screen.findByTestId('recent-session'), 'recent-session-last-used')).toBe(
      text,
    );
  });

  it('removes only the entry in the browser with "Aus Liste entfernen"', async () => {
    const user = userEvent.setup();
    const test = await setup(true, { [FIRST]: view(FIRST), [SECOND]: view(SECOND) }, [
      { sessionId: FIRST },
      { sessionId: SECOND },
    ]);
    renderWithBackend(<RecentSessionsList />, test.backend);
    const rows = await screen.findAllByTestId('recent-session');
    const callsBefore = test.calls.length;
    const remove = within(rows[0] as HTMLElement).getByTestId('recent-session-remove');
    expect(remove.textContent).toBe('Aus Liste entfernen');
    expect(remove.getAttribute('data-variant')).toBe('text');

    await user.click(remove);

    expect(
      screen.getAllByTestId('recent-session').map((row) => textOf(row, 'recent-session-id')),
    ).toEqual([FIRST]);
    expect(test.backend.recent.list().map((entry) => entry.sessionId)).toEqual([FIRST]);
    expect(test.calls).toHaveLength(callsBefore);

    await user.click(screen.getByTestId('recent-session-remove'));

    expect(screen.queryByTestId('recent-sessions')).toBeNull();
  });

  it('shows no section and clears the list when the backend switches the list off', async () => {
    const test = await setup(false, {}, [{ sessionId: FIRST }]);
    expect(test.backend.recent.enabled()).toBe(false);
    expect(test.backend.recent.list()).toHaveLength(1);

    renderWithBackend(<RecentSessionsList />, test.backend);

    await waitFor(() => expect(test.backend.recent.list()).toEqual([]));
    expect(screen.queryByTestId('recent-sessions')).toBeNull();
    expect(sessionCalls(test.calls)).toEqual([]);
  });

  it('shows no section and keeps the list while the setting is unknown', async () => {
    const test = await setup(null, {}, [{ sessionId: FIRST }]);
    expect(test.backend.recent.enabled()).toBeNull();

    renderWithBackend(<RecentSessionsList />, test.backend);

    expect(screen.queryByTestId('recent-sessions')).toBeNull();
    expect(test.backend.recent.list()).toHaveLength(1);
    expect(test.calls).toEqual([]);
  });

  it('shows no section without entries', async () => {
    const test = await setup(true);

    renderWithBackend(<RecentSessionsList />, test.backend);

    expect(screen.queryByTestId('recent-sessions')).toBeNull();
    expect(sessionCalls(test.calls)).toEqual([]);
  });
});
