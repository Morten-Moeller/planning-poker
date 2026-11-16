import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, votingDeveloper } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { Card, CardDeck } from './card-deck';

const SESSION_ID = 'K7P2QX9M';
const VOTE_URL = `/api/sessions/${SESSION_ID}/vote`;
const CARD_IDS = [
  'card-0',
  'card-1',
  'card-2',
  'card-3',
  'card-5',
  'card-8',
  'card-13',
  'card-21',
  'card-34',
  'card-?',
  'card-COFFEE',
];

function withMyVote(myVote: Card | null): SessionView {
  return { ...votingDeveloper, round: { ...votingDeveloper.round!, myVote } };
}

describe('CardDeck', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<CardDeck>;

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
      token: 'token-dev',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(CardDeck);
    fixture.componentRef.setInput('sessionId', SESSION_ID);
    await fixture.whenStable();
  }

  async function receive(snapshot: SessionView): Promise<void> {
    sockets.last().receive({ type: 'session.state', payload: snapshot });
    await fixture.whenStable();
  }

  function cards(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '[data-testid^="card-"]:not([data-testid="card-deck"])',
      ),
    );
  }

  function card(value: string): HTMLButtonElement {
    const found = cards().find((node) => node.dataset['testid'] === `card-${value}`);
    if (found === undefined) {
      throw new Error(`no card ${value}`);
    }
    return found;
  }

  function pressed(): string[] {
    return cards()
      .filter((node) => node.getAttribute('aria-pressed') === 'true')
      .map((node) => node.dataset['testid'] ?? '');
  }

  it('shows the eleven cards of the deck in deck order', async () => {
    await open(withMyVote(null));

    expect(cards().map((node) => node.dataset['testid'])).toEqual(CARD_IDS);
    expect(cards().map((node) => node.textContent?.trim())).toEqual([
      '0',
      '1',
      '2',
      '3',
      '5',
      '8',
      '13',
      '21',
      '34',
      '?',
      '☕',
    ]);
  });

  it('names the coffee card Kaffeepause for assistive technology', async () => {
    await open(votingDeveloper);

    expect(card('COFFEE').getAttribute('aria-label')).toBe('Kaffeepause');
    expect(card('5').hasAttribute('aria-label')).toBe(false);
  });

  it('renders every card as a button in the tab order', async () => {
    await open(votingDeveloper);

    for (const node of cards()) {
      expect(node.tagName).toBe('BUTTON');
      expect(node.type).toBe('button');
      expect(node.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('marks no card without an own vote', async () => {
    await open(withMyVote(null));

    expect(pressed()).toEqual([]);
    expect(cards().every((node) => node.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('marks only the card of the own vote from the snapshot', async () => {
    await open(votingDeveloper);

    expect(pressed()).toEqual(['card-5']);

    await receive(withMyVote('COFFEE'));

    expect(pressed()).toEqual(['card-COFFEE']);
  });

  it('sends the chosen card and keeps the mark until the next snapshot', async () => {
    await open(votingDeveloper);

    card('8').click();
    await fixture.whenStable();

    const request = http.expectOne(VOTE_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ card: '8' });
    expect(pressed()).toEqual(['card-5']);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('blocks the cards while the vote is being sent', async () => {
    await open(votingDeveloper);

    card('8').click();
    await fixture.whenStable();
    const request = http.expectOne(VOTE_URL);

    expect(card('13').getAttribute('aria-disabled')).toBe('true');
    card('13').click();
    await fixture.whenStable();
    http.expectNone(VOTE_URL);

    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(card('13').getAttribute('aria-disabled')).not.toBe('true');
  });

  it('unblocks the cards after a failed vote', async () => {
    await open(votingDeveloper);

    card('8').click();
    await fixture.whenStable();
    http.expectOne(VOTE_URL).flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'The round is already revealed.',
        errorCode: 'INVALID_STATE',
      },
      {
        status: 409,
        statusText: 'Conflict',
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
    await fixture.whenStable();

    expect(card('13').getAttribute('aria-disabled')).not.toBe('true');
  });
});
