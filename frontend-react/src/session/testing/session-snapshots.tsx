import { act, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { IssueListResponse, SessionView } from '../../api/api';
import { useBackend } from '../../api/backend';
import { revealedDeveloper } from '../../api/examples';
import { createTestBackend, renderWithBackend } from '../../api/testing/test-backend';
import type { Answer, FetchCall, TestBackend } from '../../api/testing/test-backend';

type Participant = SessionView['participants'][number];
type HistoryEntry = SessionView['history'][number];

export const VIEWER_ID = '01973f5e-2a4f-7a1b-8c2d-3e4f5a6b7c8d';

const TOKEN = 'token-of-the-test';

function viewer(name: string, id = `id-${name.toLowerCase()}`): Participant {
  return { id, name, role: 'VIEWER', connected: true, hasVoted: false };
}

export function withViewers(snapshot: SessionView, ...names: string[]): SessionView {
  return {
    ...snapshot,
    participants: [...snapshot.participants, ...names.map((name) => viewer(name))],
  };
}

export function asViewer(snapshot: SessionView, name = 'Paula'): SessionView {
  return {
    ...snapshot,
    me: { participantId: VIEWER_ID, role: 'VIEWER' },
    participants: [...snapshot.participants, viewer(name, VIEWER_ID)],
    round: snapshot.round === null ? null : { ...snapshot.round, myVote: null },
    invites: null,
  };
}

export function unconfirmedEntry(): HistoryEntry {
  const entry = revealedDeveloper.history[0];
  if (entry === undefined) {
    throw new Error('the example revealed-developer has no history entry');
  }
  return entry;
}

export function confirmedEntry(changes: Partial<HistoryEntry> = {}): HistoryEntry {
  return { ...unconfirmedEntry(), roundNumber: 2, finalCard: '5', ...changes };
}

export function withHistory(snapshot: SessionView, ...history: HistoryEntry[]): SessionView {
  return { ...snapshot, history };
}

export function inRound(snapshot: SessionView, number: number): SessionView {
  return {
    ...snapshot,
    round: snapshot.round === null ? null : { ...snapshot.round, number },
  };
}

const NO_CONTENT: Answer = () => new Response(null, { status: 204 });

const ISSUE_LIST = /\/issues(\?|$)/;

export function isIssueList(call: FetchCall): boolean {
  return call.method === 'GET' && ISSUE_LIST.test(call.url);
}

export function issuePage(
  items: IssueListResponse['items'] = [],
  nextPage: number | null = null,
  total: number | null = items.length,
): Response {
  return Response.json({ items, nextPage, total } satisfies IssueListResponse);
}

export function sessionAnswer(
  snapshot: SessionView,
  command: Answer = NO_CONTENT,
  issues: Answer = () => issuePage(),
): Answer {
  return (call) => {
    if (isIssueList(call)) {
      return issues(call);
    }
    return call.method === 'GET' ? Response.json(snapshot) : command(call);
  };
}

export function sessionBackend(
  snapshot: SessionView,
  command: Answer = NO_CONTENT,
  issues?: Answer,
): TestBackend {
  const test = createTestBackend(sessionAnswer(snapshot, command, issues));
  test.backend.tokens.store(snapshot.sessionId, {
    participantId: snapshot.me.participantId,
    token: TOKEN,
  });
  return test;
}

export async function renderInSession(
  ui: ReactNode,
  snapshot: SessionView,
  command: Answer = NO_CONTENT,
  issues?: Answer,
) {
  const test = sessionBackend(snapshot, command, issues);
  const view = renderWithBackend(ui, test.backend);
  act(() => test.backend.sessions.enter(snapshot.sessionId));
  await waitFor(() => {
    if (test.sockets.sockets.length === 0) {
      throw new Error('the session store opened no socket; inspect the answer to GET');
    }
  });
  return { ...test, ...view };
}

export function receiveSnapshot(test: TestBackend, snapshot: SessionView): void {
  act(() => test.sockets.last().receive({ type: 'session.state', payload: snapshot }));
}

type Round = NonNullable<SessionView['round']>;

export function withRound(snapshot: SessionView, changes: Partial<Round>): SessionView {
  return {
    ...snapshot,
    round: snapshot.round === null ? null : { ...snapshot.round, ...changes },
  };
}

export function withParticipant(
  snapshot: SessionView,
  name: string,
  changes: Partial<Participant>,
): SessionView {
  return {
    ...snapshot,
    participants: snapshot.participants.map((participant) =>
      participant.name === name ? { ...participant, ...changes } : participant,
    ),
  };
}

export function withDeveloper(snapshot: SessionView, name: string, connected = true): SessionView {
  return {
    ...snapshot,
    participants: [
      ...snapshot.participants,
      { id: `id-${name.toLowerCase()}`, name, role: 'DEVELOPER', connected, hasVoted: false },
    ],
  };
}

export function SessionPart({ render }: { render: (session: SessionView) => ReactNode }) {
  const { sessions } = useBackend();
  const session = useSyncExternalStore(sessions.subscribe, sessions.session);
  return session === null ? null : render(session);
}
