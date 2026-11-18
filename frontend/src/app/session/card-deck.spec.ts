import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, discussionDeveloper, votingDeveloper } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { CardDeck } from './card-deck';
import { Card } from './cards';

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

  async function open(snapshot: SessionView, locked = false): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token-dev',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(CardDeck);
    fixture.componentRef.setInput('sessionId', SESSION_ID);
    fixture.componentRef.setInput('locked', locked);
    await fixture.whenStable();
  }

  async function receive(snapshot: SessionView): Promise<void> {
    sockets.last().receive({ type: 'session.state', payload: snapshot });
    await fixture.whenStable();
  }

  function cards(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'button[data-testid^="card-"]',
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

  it('names every card with Karte and the value for assistive technology', async () => {
    await open(votingDeveloper);

    expect(card('COFFEE').getAttribute('aria-label')).toBe('Karte Kaffeepause');
    expect(card('?').getAttribute('aria-label')).toBe('Karte Unklar');
    expect(card('5').getAttribute('aria-label')).toBe('Karte 5');
  });

  it('shows the cards as a group named Deine Karte with the hint for the voting', async () => {
    await open(votingDeveloper);

    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Deine Karte');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[data-testid="card-deck-hint"]')
        ?.textContent?.trim(),
    ).toBe('Du kannst sie ändern, bis aufgelöst wird.');
  });

  function key(target: HTMLElement, value: string): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }));
  }

  it.each([
    ['ArrowRight', '8', '13'],
    ['ArrowDown', '8', '13'],
    ['ArrowLeft', '8', '5'],
    ['ArrowRight', 'COFFEE', '0'],
    ['ArrowLeft', '0', 'COFFEE'],
    ['Home', '8', '0'],
    ['End', '8', 'COFFEE'],
  ])('moves the focus with %s from card %s to card %s', async (pressed, from, to) => {
    await open(votingDeveloper);
    card(from).focus();

    key(card(from), pressed);

    expect(document.activeElement).toBe(card(to));
    http.expectNone(VOTE_URL);
  });

  it.each(['Enter', ' '])('chooses the focused card with the key %j', async (pressed) => {
    await open(withMyVote(null));
    card('8').focus();
    key(card('8'), 'ArrowRight');

    key(card('13'), pressed);
    await fixture.whenStable();

    const request = http.expectOne(VOTE_URL);
    expect(request.request.body).toEqual({ card: '13' });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  function rect(left: number, width: number): DOMRect {
    return {
      left,
      right: left + width,
      width,
      top: 0,
      bottom: 70,
      height: 70,
      x: left,
      y: 0,
    } as DOMRect;
  }

  function placeInRow(list: HTMLElement): void {
    list.getBoundingClientRect = () => rect(0, 200);
    cards().forEach((node, index) => {
      node.getBoundingClientRect = () => rect(index * 56 - list.scrollLeft, 48);
    });
  }

  it('moves the focus to the last card, chooses it with Enter and scrolls it into the row', async () => {
    await open(withMyVote(null));
    const list = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[role="group"]',
    )!;
    placeInRow(list);
    card('0').focus();

    for (let step = 1; step < CARD_IDS.length; step++) {
      key(document.activeElement as HTMLElement, 'ArrowRight');
    }
    expect(document.activeElement).toBe(card('COFFEE'));
    expect(list.scrollLeft).toBe(10 * 56 + 48 - 200);

    key(card('COFFEE'), 'Enter');
    await fixture.whenStable();
    const request = http.expectOne(VOTE_URL);
    expect(request.request.body).toEqual({ card: 'COFFEE' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    list.scrollLeft = 0;

    await receive(withMyVote('COFFEE'));

    expect(pressed()).toEqual(['card-COFFEE']);
    expect(list.scrollLeft).toBe(10 * 56 + 48 - 200);
  });

  function unlockIndexes(): (string | null)[] {
    return cards().map((node) =>
      node.classList.contains('unlock') ? node.style.getPropertyValue('--unlock-index') : null,
    );
  }

  it('unlocks the cards one after another when the same deck changes from locked to open', async () => {
    await open(discussionDeveloper, true);
    expect(unlockIndexes().every((index) => index === null)).toBe(true);

    fixture.componentRef.setInput('locked', false);
    await receive(votingDeveloper);

    expect(unlockIndexes()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(cards().every((node) => node.getAttribute('aria-disabled') === null)).toBe(true);

    card('5').click();
    await fixture.whenStable();

    http.expectOne(VOTE_URL).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('shows no unlock animation on the first render of an open deck', async () => {
    await open(votingDeveloper);

    expect(unlockIndexes().every((index) => index === null)).toBe(true);
  });

  describe('under reduced motion', () => {
    beforeEach(() => {
      Object.defineProperty(document.defaultView!, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }),
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(document.defaultView!, 'matchMedia');
    });

    it('opens the cards without the unlock animation', async () => {
      await open(discussionDeveloper, true);

      fixture.componentRef.setInput('locked', false);
      await receive(votingDeveloper);

      expect(unlockIndexes().every((index) => index === null)).toBe(true);
    });
  });

  it('shows the locked deck in DISCUSSION and sends no vote on click or key', async () => {
    await open(discussionDeveloper, true);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="card-deck"]')).toBeNull();
    expect(root.querySelector('[data-testid="card-deck-locked"]')).not.toBeNull();
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Deine Karte · gesperrt');
    expect(root.querySelector('[data-testid="discussion-hint"]')?.textContent?.trim()).toBe(
      'Diskussion: Die Karten werden geöffnet, wenn der Scrum Master die Schätzung startet.',
    );
    expect(cards()).toHaveLength(11);
    expect(cards().every((node) => node.getAttribute('aria-disabled') === 'true')).toBe(true);

    card('5').click();
    key(card('8'), 'Enter');
    await fixture.whenStable();

    http.expectNone(VOTE_URL);
    expect(pressed()).toEqual([]);
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
