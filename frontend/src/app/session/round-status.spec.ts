import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, votingDeveloper, votingScrumMaster } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { RoundStatus } from './round-status';

const SESSION_ID = 'K7P2QX9M';
const REVEAL_URL = `/api/sessions/${SESSION_ID}/round/reveal`;

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

  it.each([
    ['scrum master', votingScrumMaster],
    ['developer', votingDeveloper],
  ])('shows the round number after a new round to the %s', async (_role, snapshot) => {
    await open({ ...snapshot, round: { ...snapshot.round!, number: 2 } });

    expect(text('round-number')).toBe('Runde 2');
  });
});
