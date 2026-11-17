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
const REVEAL_URL = `/api/sessions/${SESSION_ID}/round/reveal`;
const START_URL = `/api/sessions/${SESSION_ID}/round/start`;

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
    fixture.componentRef.setInput('sessionId', SESSION_ID);
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

  function revealButton(): HTMLButtonElement {
    return all('round-reveal')[0] as HTMLButtonElement;
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

  it('shows no hint to the scrum master before every connected developer voted', async () => {
    await open(votingScrumMaster);

    expect(all('all-voted-hint')).toHaveLength(0);
    expect(revealButton().classList).toContain('mat-mdc-outlined-button');
  });

  it('shows the hint and the filled reveal button to the scrum master when all voted', async () => {
    await open(votingScrumMaster);

    await receive({ ...votingScrumMaster, round: { ...votingScrumMaster.round!, allVoted: true } });

    const hint = all('all-voted-hint')[0];
    expect(hint.getAttribute('role')).toBe('status');
    expect(text('all-voted-hint')).toContain('Alle verbundenen Entwickler haben geschätzt');
    expect(revealButton().classList).toContain('mat-mdc-unelevated-button');
  });

  it('renders neither hint nor reveal button for a developer', async () => {
    await open({ ...votingDeveloper, round: { ...votingDeveloper.round!, allVoted: true } });

    expect(all('all-voted-hint')).toHaveLength(0);
    expect(all('round-reveal')).toHaveLength(0);
    expect(all('vote-counter')).toHaveLength(1);
  });

  it('lets the scrum master reveal before every developer voted', async () => {
    await open(votingScrumMaster);
    expect(revealButton().disabled).toBe(false);

    revealButton().click();
    await fixture.whenStable();

    const request = http.expectOne(REVEAL_URL);
    expect(request.request.method).toBe('POST');
    expect(revealButton().disabled).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(revealButton().disabled).toBe(false);
  });

  it('shows the hint without counter and start button to a developer in DISCUSSION', async () => {
    await open(discussionDeveloper);
    expect(all('card-deck-locked')).toHaveLength(1);
    expect(all('card-deck')).toHaveLength(0);
    expect(text('round-phase')).toBe('Diskussion');
    expect(text('round-number')).toBe('Runde 1');
    expect(text('discussion-timer')).toBe('◷ 1:00 · startet mit der Schätzung');

    expect(text('discussion-hint')).toBe(
      'Diskussion: Die Karten werden geöffnet, wenn der Scrum Master die Schätzung startet.',
    );
    expect(all('round-start')).toHaveLength(0);
    expect(all('vote-counter')).toHaveLength(0);
    expect(all('round-reveal')).toHaveLength(0);
  });

  it('shows the start button with the timer to the scrum master and sends the start', async () => {
    await open(discussionScrumMaster);
    expect(text('discussion-hint')).toBe('Das Team diskutiert das Issue.');
    expect(all('discussion-hint')[0].parentElement?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Das Team diskutiert das Issue. Die Karten sind gesperrt, bis du die Schätzung startest. Timer: 1 min.',
    );
    expect(all('card-deck-locked')).toHaveLength(0);
    const start = all('round-start')[0] as HTMLButtonElement;
    expect(text('round-start')).toBe('Schätzung starten');
    expect(text('round-start-timer')).toBe('Timer: 1 min');
    expect(all('round-reveal')).toHaveLength(0);

    start.click();
    await fixture.whenStable();

    const request = http.expectOne(START_URL);
    expect(request.request.method).toBe('POST');
    expect(start.disabled).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(start.disabled).toBe(false);
  });

  it.each([
    ['no timer', null, null],
    ['a timer outside the options', 45, 'Timer: 45 s'],
  ])('shows the start button with %s', async (_case, seconds, expected) => {
    await open({ ...discussionScrumMaster, timerSeconds: seconds });

    expect(all('round-start')).toHaveLength(1);
    if (expected === null) {
      expect(all('round-start-timer')).toHaveLength(0);
      expect(all('discussion-timer')).toHaveLength(0);
    } else {
      expect(text('round-start-timer')).toBe(expected);
    }
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

  it.each([
    [[developer('Ben', true, true), developer('Cem', true, false)], 'Noch 1 Schätzung ausstehend.'],
    [
      [developer('Ben', true, false), developer('Cem', true, false), developer('Dan', true, false)],
      'Noch 3 Schätzungen ausstehend.',
    ],
  ])('names the open votes to the scrum master %#', async (developers, expected) => {
    await open(withParticipants(votingScrumMaster, developers));

    expect(text('pending-hint')).toBe(`${expected} Du kannst auch vorher auflösen.`);
    expect(all('pending-hint')[0].getAttribute('role')).toBe('status');
  });

  it.each([
    [
      [developer('Ben', true, true), developer('Finn', false, false)],
      'Finn ist getrennt und wird nicht abgewartet.',
    ],
    [
      [
        developer('Ben', true, true),
        developer('Finn', false, false),
        developer('Gus', false, false),
      ],
      'Finn, Gus sind getrennt und werden nicht abgewartet.',
    ],
  ])('names the disconnected developers when all others voted %#', async (developers, absent) => {
    await open(withParticipants(votingScrumMaster, developers, true));

    expect(text('all-voted-hint')).toBe(`✓ Alle verbundenen Entwickler haben geschätzt. ${absent}`);
    expect(all('pending-hint')).toHaveLength(0);
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
