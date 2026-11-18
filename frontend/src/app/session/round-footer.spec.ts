import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import {
  discussionDeveloper,
  discussionScrumMaster,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  SessionView,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { Card } from './cards';
import { RoundFooter } from './round-footer';

const SESSION_ID = 'K7P2QX9M';
const START_URL = `/api/sessions/${SESSION_ID}/round/start`;
const REVEAL_URL = `/api/sessions/${SESSION_ID}/round/reveal`;
const RESTART_URL = `/api/sessions/${SESSION_ID}/round/restart`;
const FOOTER_IDS = [
  'card-deck',
  'card-deck-locked',
  'discussion-hint',
  'round-start',
  'round-reveal',
  'all-voted-hint',
  'pending-hint',
  'round-restart',
  'result-accept',
  'result-waiting',
];

type Participant = SessionView['participants'][number];
type Round = NonNullable<SessionView['round']>;

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

function withRound(base: SessionView, round: Partial<Round>): SessionView {
  return { ...base, round: { ...base.round!, ...round } };
}

function withVotes(base: SessionView, cards: Card[]): SessionView {
  const names = ['Ben', 'Cem', 'Dana'];
  return withRound(base, {
    votes: cards.map((card, index) => ({
      participantId: `id-${names[index].toLowerCase()}`,
      name: names[index],
      card,
    })),
  });
}

describe('RoundFooter', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<RoundFooter>;

  beforeEach(() => {
    sessionStorage.clear();
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    fixture.destroy();
    store.leave();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
    http.verify();
  });

  async function open(snapshot: SessionView): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(RoundFooter);
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

  function button(id: string): HTMLButtonElement {
    return all(id)[0] as HTMLButtonElement;
  }

  function shown(): string[] {
    return FOOTER_IDS.filter((id) => all(id).length > 0);
  }

  it.each([
    ['LOBBY', 'scrum master', lobbyScrumMaster, []],
    ['LOBBY', 'developer', lobbyDeveloper, []],
    ['DISCUSSION', 'scrum master', discussionScrumMaster, ['discussion-hint', 'round-start']],
    ['DISCUSSION', 'developer', discussionDeveloper, ['card-deck-locked', 'discussion-hint']],
    ['VOTING', 'scrum master', votingScrumMaster, ['round-reveal', 'pending-hint']],
    ['VOTING', 'developer', votingDeveloper, ['card-deck']],
    ['REVEALED', 'scrum master', revealedScrumMaster, ['round-restart', 'result-accept']],
    ['REVEALED', 'developer', revealedDeveloper, ['result-waiting']],
  ])('shows in %s to the %s exactly its content', async (_phase, _role, snapshot, expected) => {
    await open(snapshot);

    expect(shown()).toEqual(expected);
    expect(all('round-footer')).toHaveLength(expected.length === 0 ? 0 : 1);
  });

  it('shows the locked deck with the discussion hint to a developer in DISCUSSION', async () => {
    await open(discussionDeveloper);

    expect(text('discussion-hint')).toBe(
      'Diskussion: Die Karten werden geöffnet, wenn der Scrum Master die Schätzung startet.',
    );
    const cards = Array.from(all('card-deck-locked')[0].querySelectorAll('button'));
    expect(cards).toHaveLength(11);
    expect(cards.every((node) => node.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('shows the start button with the timer to the scrum master and sends the start', async () => {
    await open(discussionScrumMaster);
    expect(text('discussion-hint')).toBe('Das Team diskutiert das Issue.');
    expect(all('discussion-hint')[0].parentElement?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Das Team diskutiert das Issue. Die Karten sind gesperrt, bis du die Schätzung startest. Timer: 1 min.',
    );
    const start = button('round-start');
    expect(text('round-start')).toBe('Schätzung starten');
    expect(text('round-start-timer')).toBe('Timer: 1 min');

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
    } else {
      expect(text('round-start-timer')).toBe(expected);
    }
  });

  it('keeps the same deck for a developer from DISCUSSION to VOTING', async () => {
    await open(discussionDeveloper);
    const deck = (fixture.nativeElement as HTMLElement).querySelector('app-card-deck');
    expect(deck?.querySelector('[data-testid="card-deck-locked"]')).not.toBeNull();

    await receive(votingDeveloper);

    const after = (fixture.nativeElement as HTMLElement).querySelector('app-card-deck');
    expect(after).toBe(deck);
    expect(after?.querySelector('[data-testid="card-deck"]')).not.toBeNull();
  });

  it('shows the open deck to a developer while voting', async () => {
    await open(votingDeveloper);

    expect(text('card-deck-hint')).toBe('Du kannst sie ändern, bis aufgelöst wird.');
    expect(all('card-COFFEE')).toHaveLength(1);
  });

  it('shows no hint and the outlined reveal button before every developer voted', async () => {
    await open(votingScrumMaster);

    expect(all('all-voted-hint')).toHaveLength(0);
    expect(button('round-reveal').classList).toContain('mat-mdc-outlined-button');
  });

  it('shows the hint and the filled reveal button to the scrum master when all voted', async () => {
    await open(votingScrumMaster);

    await receive(withRound(votingScrumMaster, { allVoted: true }));

    expect(all('all-voted-hint')[0].getAttribute('role')).toBe('status');
    expect(text('all-voted-hint')).toContain('Alle verbundenen Entwickler haben geschätzt');
    expect(button('round-reveal').classList).toContain('mat-mdc-unelevated-button');
  });

  it('lets the scrum master reveal before every developer voted', async () => {
    await open(votingScrumMaster);
    expect(button('round-reveal').disabled).toBe(false);

    button('round-reveal').click();
    await fixture.whenStable();

    const request = http.expectOne(REVEAL_URL);
    expect(request.request.method).toBe('POST');
    expect(button('round-reveal').disabled).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(button('round-reveal').disabled).toBe(false);
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

  it('shows the waiting text to a developer and the actions to the scrum master after the reveal', async () => {
    await open(revealedDeveloper);
    expect(text('result-waiting')).toBe(
      'Der Scrum Master lässt erneut schätzen oder übernimmt das Ergebnis.',
    );
    fixture.destroy();
    store.leave();

    await open(revealedScrumMaster);
    expect(text('round-restart')).toBe('↻ Erneut schätzen');
    expect(text('result-accept')).toBe('Ergebnis übernehmen …');
    expect(button('round-restart').disabled).toBe(false);
    expect(button('result-accept').disabled).toBe(false);
  });

  it('shows the restart symbol larger in its own hidden span', async () => {
    await open(revealedScrumMaster);

    const symbol = button('round-restart').querySelector<HTMLElement>('.symbol')!;
    expect(symbol.textContent).toBe('↻');
    expect(symbol.getAttribute('aria-hidden')).toBe('true');
    expect(parseFloat(getComputedStyle(symbol).fontSize)).toBeGreaterThan(
      parseFloat(getComputedStyle(fixture.nativeElement as HTMLElement).fontSize),
    );
  });

  it('disables both result actions while the result is written', async () => {
    await open(withRound(revealedScrumMaster, { confirming: true }));

    expect(button('round-restart').disabled).toBe(true);
    expect(button('result-accept').disabled).toBe(true);

    button('round-restart').click();
    await fixture.whenStable();

    http.expectNone(RESTART_URL);
    expect(document.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });

  it('starts a new round and blocks the button during the call', async () => {
    await open(revealedScrumMaster);

    button('round-restart').click();
    await fixture.whenStable();

    const request = http.expectOne(RESTART_URL);
    expect(request.request.method).toBe('POST');
    expect(button('round-restart').disabled).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(button('round-restart').disabled).toBe(false);
  });

  it('opens the result dialog and blocks the actions while it is open', async () => {
    await open(revealedScrumMaster);

    button('result-accept').click();
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="confirm-dialog"]')).not.toBeNull();
    expect(button('result-accept').disabled).toBe(true);
  });

  it.each([
    ['the consensus card', ['8', '8'] as Card[], 1],
    ['no card without a consensus', ['5', '8'] as Card[], 0],
  ])('preselects %s in the result dialog', async (_case, cards, checked) => {
    await open(withVotes(revealedScrumMaster, cards));

    button('result-accept').click();
    await fixture.whenStable();

    const inputs = document.querySelectorAll<HTMLInputElement>(
      '[data-testid="confirm-dialog"] [data-testid="confirm-card"] input:checked',
    );
    expect(inputs).toHaveLength(checked);
    if (checked === 1) {
      expect(inputs[0].value).toBe('8');
    }
  });
});
