import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import {
  discussionDeveloper,
  discussionScrumMaster,
  SessionView,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { RoundStatus } from './round-status';

const SESSION_ID = 'K7P2QX9M';
const FOOTER_IDS = [
  'card-deck',
  'card-deck-locked',
  'discussion-hint',
  'round-start',
  'round-reveal',
  'all-voted-hint',
  'pending-hint',
];

type Participant = SessionView['participants'][number];

function developer(name: string, connected: boolean, hasVoted: boolean): Participant {
  return { id: `id-${name}`, name, role: 'DEVELOPER', connected, hasVoted };
}

function withParticipants(
  base: SessionView,
  developers: Participant[],
  allVoted = false,
): SessionView {
  return {
    ...base,
    participants: [base.participants[0], ...developers],
    round: { ...base.round!, allVoted },
  };
}

describe('RoundStatus', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<RoundStatus>;

  beforeEach(() => {
    sessionStorage.clear();
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    fixture.destroy();
    store.leave();
    http.verify();
  });

  async function open(snapshot: SessionView): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(RoundStatus);
    await fixture.whenStable();
  }

  async function receive(snapshot: SessionView): Promise<void> {
    sockets.last().receive({ type: 'session.state', payload: snapshot });
    await fixture.whenStable();
  }

  function all(id: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
    );
  }

  function text(id: string): string {
    return all(id)[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  it.each([
    ['no vote', [developer('Ben', true, false), developer('Cem', true, false)], '0 von 2'],
    ['one vote', [developer('Ben', true, true), developer('Cem', true, false)], '1 von 2'],
    ['every vote', [developer('Ben', true, true), developer('Cem', true, true)], '2 von 2'],
    [
      'a disconnected developer without a vote',
      [developer('Ben', true, true), developer('Cem', false, false)],
      '1 von 1',
    ],
    [
      'a disconnected developer with a vote',
      [developer('Ben', true, false), developer('Cem', false, true)],
      '0 von 1',
    ],
    ['no developer', [], '0 von 0'],
  ])('counts the connected developers with %s', async (_case, developers, expected) => {
    await open(withParticipants(votingDeveloper, developers));

    expect(text('vote-counter')).toBe(`${expected} haben geschätzt`);
  });

  it('updates the counter with the next snapshot', async () => {
    await open(
      withParticipants(votingScrumMaster, [
        developer('Ben', true, false),
        developer('Cem', true, false),
      ]),
    );
    expect(text('vote-counter')).toBe('0 von 2 haben geschätzt');

    await receive(
      withParticipants(votingScrumMaster, [
        developer('Ben', true, true),
        developer('Cem', true, false),
      ]),
    );

    expect(text('vote-counter')).toBe('1 von 2 haben geschätzt');
  });

  it.each([
    ['scrum master in DISCUSSION', discussionScrumMaster],
    ['developer in DISCUSSION', discussionDeveloper],
    [
      'scrum master in VOTING',
      { ...votingScrumMaster, round: { ...votingScrumMaster.round!, allVoted: true } },
    ],
    ['developer in VOTING', votingDeveloper],
  ])('shows neither card deck nor action box to the %s', async (_case, snapshot) => {
    await open(snapshot);

    expect(FOOTER_IDS.filter((id) => all(id).length > 0)).toEqual([]);
  });

  it('shows phase, round and timer without counter or table in DISCUSSION', async () => {
    await open(discussionDeveloper);
    expect(text('round-phase')).toBe('Diskussion');
    expect(text('round-number')).toBe('Runde 1');
    expect(text('discussion-timer')).toBe('◷ 1:00 · startet mit der Schätzung');
    expect(all('vote-counter')).toHaveLength(0);
    expect(all('seat-table')).toHaveLength(0);
  });

  it('shows no discussion timer without a timer', async () => {
    await open({ ...discussionScrumMaster, timerSeconds: null });

    expect(all('discussion-timer')).toHaveLength(0);
  });

  it.each([
    ['scrum master', votingScrumMaster],
    ['developer', votingDeveloper],
  ])('shows the round number after a new round to the %s', async (_role, snapshot) => {
    await open({ ...snapshot, round: { ...snapshot.round!, number: 2 } });

    expect(text('round-number')).toBe('Runde 2');
  });

  it.each([
    [[developer('Ben', true, false), developer('Cem', true, false)], '0', '0'],
    [[developer('Ben', true, true), developer('Cem', true, false)], '1', '50'],
    [[developer('Ben', true, true), developer('Cem', true, true)], '2', '100'],
  ])('fills the progress bar to %#', async (developers, now, width) => {
    await open(withParticipants(votingDeveloper, developers));

    const bar = all('vote-progress')[0];
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe(now);
    expect(bar.getAttribute('aria-valuemax')).toBe('2');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe(`${width}%`);
  });

  it('shows the table with the seats while the round runs', async () => {
    await open(votingDeveloper);

    expect(all('seat-table')).toHaveLength(1);
    expect(all('card-deck')).toHaveLength(0);
  });

  it('shows the name of the motif and the timer in the phase bar', async () => {
    await open(votingDeveloper);
    fixture.componentRef.setInput('motif', 3);
    await fixture.whenStable();

    const bar = (fixture.nativeElement as HTMLElement).querySelector('.bar')!;
    expect(text('motif-name')).toBe('Kartensatz: Ringe');
    expect(bar.querySelector('[data-testid="round-timer"]')?.getAttribute('role')).toBe('timer');
  });

  it('shows no motif name without a motif', async () => {
    await open(votingDeveloper);

    expect(all('motif-name')).toHaveLength(0);
  });
});
