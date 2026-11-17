import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { revealedDeveloper, revealedScrumMaster, SessionView } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { Card } from './cards';
import { RoundResult } from './round-result';

const SESSION_ID = 'K7P2QX9M';
const RESTART_URL = `/api/sessions/${SESSION_ID}/round/restart`;

type Round = NonNullable<SessionView['round']>;

function withRound(base: SessionView, round: Partial<Round>): SessionView {
  return { ...base, round: { ...base.round!, ...round } };
}

const coffeeAndQuestion = withRound(revealedDeveloper, {
  votes: [
    { participantId: 'id-ben', name: 'Ben', card: 'COFFEE' },
    { participantId: 'id-cem', name: 'Cem', card: '?' },
    { participantId: 'id-dan', name: 'Dan', card: 'COFFEE' },
  ],
  stats: {
    distribution: [
      { card: '?', count: 1 },
      { card: 'COFFEE', count: 2 },
    ],
    average: null,
    mostFrequent: ['COFFEE'],
  },
});

const numbers = withRound(revealedScrumMaster, {
  votes: [
    { participantId: 'id-ben', name: 'Ben', card: '13' },
    { participantId: 'id-cem', name: 'Cem', card: '2' },
    { participantId: 'id-dan', name: 'Dan', card: '3' },
    { participantId: 'id-eva', name: 'Eva', card: '2' },
  ],
  stats: {
    distribution: [
      { card: '2', count: 2 },
      { card: '3', count: 1 },
      { card: '13', count: 1 },
    ],
    average: 5,
    mostFrequent: ['2'],
  },
});

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

type Participant = SessionView['participants'][number];

function developer(name: string, connected = true): Participant {
  return {
    id: `id-${name.toLowerCase()}`,
    name,
    role: 'DEVELOPER',
    connected,
    hasVoted: false,
  };
}

function withTeam(
  base: SessionView,
  developers: Participant[],
  votes: { name: string; card: Card }[],
): SessionView {
  const scrumMaster = base.participants.find((participant) => participant.role === 'SCRUM_MASTER')!;
  return {
    ...withRound(base, {
      votes: votes.map((vote) => ({
        participantId: `id-${vote.name.toLowerCase()}`,
        name: vote.name,
        card: vote.card,
      })),
    }),
    participants: [scrumMaster, ...developers],
  };
}

describe('RoundResult', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<RoundResult>;

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
    fixture = TestBed.createComponent(RoundResult);
    fixture.componentRef.setInput('sessionId', SESSION_ID);
    await fixture.whenStable();
  }

  async function receive(snapshot: SessionView): Promise<void> {
    sockets.last().receive({ type: 'session.state', payload: snapshot });
    await fixture.whenStable();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function all(id: string): HTMLElement[] {
    return Array.from(root().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`));
  }

  function texts(id: string): string[] {
    return all(id).map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  }

  function button(id: string): HTMLButtonElement {
    return all(id)[0] as HTMLButtonElement;
  }

  it('shows every vote with name and card', async () => {
    await open(revealedDeveloper);

    expect(texts('result-vote-name')).toEqual(['Ben', 'Cem']);
    expect(texts('result-vote-card')).toEqual(['5', '8']);
  });

  it('shows the count per card in deck order, the average with a comma and the most frequent cards', async () => {
    await open(numbers);

    expect(texts('result-count-card')).toEqual(['2', '3', '13']);
    expect(texts('result-count-votes')).toEqual(['2 Stimmen', '1 Stimme', '1 Stimme']);
    expect(texts('result-average')).toEqual(['5,0']);
    expect(texts('result-most-frequent')).toEqual(['2']);
  });

  it('shows 6,5 as the average of 5 and 8 and both as most frequent', async () => {
    await open(revealedDeveloper);

    expect(texts('result-average')).toEqual(['6,5']);
    expect(texts('result-most-frequent')).toEqual(['5, 8']);
  });

  it('shows no average without a number card and the coffee card as a named symbol', async () => {
    await open(coffeeAndQuestion);

    expect(texts('result-average')).toEqual(['kein Durchschnitt']);
    expect(texts('result-count-card')).toEqual(['?', '☕']);
    expect(texts('result-count-votes')).toEqual(['1 Stimme', '2 Stimmen']);
    const coffee = all('result-vote-card')[0];
    expect(coffee.textContent?.trim()).toBe('☕');
    expect(coffee.getAttribute('role')).toBe('img');
    expect(coffee.getAttribute('aria-label')).toBe('Karte Kaffeepause');
    expect(all('result-vote-card')[1].getAttribute('aria-label')).toBe('Karte Unklar');
    expect(
      all('result-most-frequent')[0].querySelector('[role="img"]')?.getAttribute('aria-label'),
    ).toBe('Kaffeepause');
  });

  it('labels average and most frequent cards as orientation without a control', async () => {
    await open(revealedScrumMaster);

    const facts = root().querySelector('.facts') as HTMLElement;
    expect(facts.textContent).toContain('Durchschnitt (Orientierung)');
    expect(facts.textContent).toContain('Häufigste Werte (Orientierung)');
    expect(facts.querySelectorAll('button, a, input')).toHaveLength(0);
    expect(root().querySelector('.distribution')!.querySelectorAll('button')).toHaveLength(0);
  });

  it.each([
    ['scrum master', revealedScrumMaster],
    ['developer', revealedDeveloper],
  ])('marks the lowest and the highest card as outliers for the %s', async (_role, base) => {
    await open(withVotes(base, ['1', '3', '13']));

    const marked = all('result-vote')
      .filter((row) => row.querySelector('[data-testid="result-vote-outlier"]') !== null)
      .map((row) => row.querySelector('[data-testid="result-vote-name"]')?.textContent?.trim());
    expect(marked).toEqual(['Ben', 'Dana']);
    expect(texts('result-vote-outlier')).toEqual(['Ausreißer', 'Ausreißer']);
    expect(texts('outlier-hint')).toEqual([
      'Niedrigste und höchste Schätzung liegen weit auseinander.',
    ]);
  });

  it('shows neither outlier nor hint when the cards lie close together', async () => {
    await open(withVotes(revealedDeveloper, ['3', '5', '8']));

    expect(all('result-vote-outlier')).toHaveLength(0);
    expect(all('outlier-hint')).toHaveLength(0);
    expect(root().querySelectorAll('.vote.outlier')).toHaveLength(0);
  });

  it('puts the outlier text into the seat of the vote and keeps it readable', async () => {
    await open(withVotes(revealedDeveloper, ['1', '3', '13']));

    const row = all('result-vote')[0];
    const label = row.querySelector<HTMLElement>('[data-testid="result-vote-outlier"]')!;
    expect(row.textContent?.replace(/\s+/g, ' ').trim()).toBe('BenAusreißer1');
    expect(row.querySelector('[data-testid="result-vote-card"]')?.classList).toContain('outlier');
    for (let node: HTMLElement | null = label; node !== row; node = node!.parentElement) {
      expect(node!.getAttribute('aria-hidden')).toBeNull();
      expect(node!.getAttribute('role')).not.toBe('img');
      expect(node!.getAttribute('aria-label')).toBeNull();
    }
  });

  it('shows the distribution as bars and the orientation without a proposal', async () => {
    await open(numbers);

    const panels = Array.from(root().querySelectorAll<HTMLElement>('.panel'));
    expect(panels.map((panel) => panel.querySelector('h3')?.textContent?.trim())).toEqual([
      'VERTEILUNG',
      'ZUR ORIENTIERUNG',
    ]);
    const widths = Array.from(root().querySelectorAll<HTMLElement>('.bar-value')).map(
      (bar) => bar.style.width,
    );
    expect(widths).toEqual(['100%', '50%', '50%']);
    expect(root().querySelector('.no-proposal')?.textContent?.trim()).toBe(
      'Kein Vorschlag: Den Endwert legt das Team fest.',
    );
  });

  it('counts the votes and names the developers who were disconnected', async () => {
    await open(
      withTeam(
        revealedScrumMaster,
        [developer('Ben'), developer('Cem'), developer('Finn', false)],
        [
          { name: 'Ben', card: '5' },
          { name: 'Cem', card: '8' },
        ],
      ),
    );

    expect(texts('result-counter')).toEqual(['2 Schätzungen · Finn war getrennt']);
  });

  it('shows the waiting text to a developer and the actions to the scrum master', async () => {
    await open(revealedDeveloper);
    expect(texts('result-waiting')).toEqual([
      'Der Scrum Master lässt erneut schätzen oder übernimmt das Ergebnis.',
    ]);
    fixture.destroy();
    store.leave();

    await open(revealedScrumMaster);
    expect(all('result-waiting')).toHaveLength(0);
    expect(texts('round-restart')).toEqual(['↻ Erneut schätzen']);
    expect(texts('result-accept')).toEqual(['Ergebnis übernehmen …']);
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

    it('renders no confetti and shows the cards without the flip', async () => {
      await open(withVotes(revealedDeveloper, ['5', '5']));

      expect(texts('consensus-hint')).toEqual(['Konsens: Alle 2 abgegebenen Stimmen zeigen 5.']);
      expect(all('consensus-confetti')).toHaveLength(0);
      expect(all('result-vote-card')).toHaveLength(2);
      expect(root().querySelectorAll('.flip')).toHaveLength(0);
    });
  });

  it('flips the revealed cards one after the other without reduced motion', async () => {
    await open(withVotes(revealedDeveloper, ['3', '5', '8']));

    const cards = all('result-vote-card');
    expect(cards.every((card) => card.classList.contains('flip'))).toBe(true);
    expect(cards.map((card) => card.style.animationDelay)).toEqual(['0ms', '40ms', '80ms']);
  });

  it.each([
    ['scrum master', revealedScrumMaster],
    ['developer', revealedDeveloper],
  ])(
    'shows the consensus hint and the confetti to the %s when all votes match',
    async (_role, base) => {
      await open(withVotes(base, ['5', '5']));

      const hint = all('consensus-hint')[0];
      expect(hint.getAttribute('role')).toBe('status');
      expect(texts('consensus-hint')).toEqual(['Konsens: Alle 2 abgegebenen Stimmen zeigen 5.']);
      const confetti = all('consensus-confetti');
      expect(confetti).toHaveLength(1);
      expect(confetti[0].getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('shows neither consensus hint nor confetti when the votes differ', async () => {
    await open(withVotes(revealedDeveloper, ['5', '8']));

    expect(all('consensus-hint')).toHaveLength(0);
    expect(all('consensus-confetti')).toHaveLength(0);
  });

  it('renders the actions for the scrum master', async () => {
    await open(revealedScrumMaster);

    expect(button('round-restart').disabled).toBe(false);
    expect(button('result-accept').disabled).toBe(false);
    expect(all('confirming-hint')).toHaveLength(0);
  });

  it('renders no action for a developer', async () => {
    await open(revealedDeveloper);

    expect(all('round-restart')).toHaveLength(0);
    expect(all('result-accept')).toHaveLength(0);
    expect(all('result-vote')).toHaveLength(2);
  });

  it.each([
    ['scrum master', revealedScrumMaster],
    ['developer', revealedDeveloper],
  ])('shows the hint to the %s while the result is written', async (_role, snapshot) => {
    await open(snapshot);

    await receive(withRound(snapshot, { confirming: true }));

    const hint = all('confirming-hint')[0];
    expect(hint.getAttribute('role')).toBe('status');
    expect(texts('confirming-hint')).toEqual(['Das Ergebnis wird nach GitLab geschrieben.']);
  });

  it('disables both actions while the result is written', async () => {
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

  it('opens the result dialog', async () => {
    await open(revealedScrumMaster);

    button('result-accept').click();
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="confirm-dialog"]')).not.toBeNull();
    expect(button('result-accept').disabled).toBe(true);
  });

  function dialogCard(card: Card): HTMLInputElement {
    return document.querySelector<HTMLInputElement>(
      `[data-testid="confirm-dialog"] [data-testid="confirm-card"] input[value="${card}"]`,
    )!;
  }

  function dialogSubmit(): HTMLButtonElement {
    return document.querySelector<HTMLButtonElement>('[data-testid="confirm-submit"]')!;
  }

  it('preselects the consensus card in the result dialog', async () => {
    await open(withVotes(revealedScrumMaster, ['8', '8']));

    button('result-accept').click();
    await fixture.whenStable();

    expect(dialogCard('8').checked).toBe(true);
    expect(dialogSubmit().disabled).toBe(false);
  });

  it('opens the result dialog without a selection when there is no consensus', async () => {
    await open(withVotes(revealedScrumMaster, ['5', '8']));

    button('result-accept').click();
    await fixture.whenStable();

    expect(document.querySelectorAll('[data-testid="confirm-card"] input:checked')).toHaveLength(0);
    expect(dialogSubmit().disabled).toBe(true);
  });

  it.each([
    ['scrum master', revealedScrumMaster],
    ['developer', revealedDeveloper],
  ])('shows the round number after a new round to the %s', async (_role, snapshot) => {
    await open(withRound(snapshot, { number: 2 }));

    expect(texts('round-number')).toEqual(['Runde 2']);
  });

  it.each([
    ['scrum master', revealedScrumMaster],
    ['developer', revealedDeveloper],
  ])('lists the developers without a vote to the %s', async (_role, base) => {
    await open(
      withTeam(
        base,
        [developer('Ben'), developer('Cem'), developer('Dana', false)],
        [{ name: 'Ben', card: '5' }],
      ),
    );

    expect(texts('not-voted')).toEqual(['Nicht geschätzt: Cem, Dana (nicht verbunden)']);
    expect(texts('not-voted-name')).toEqual(['Cem', 'Dana (nicht verbunden)']);
    expect(texts('not-voted')[0]).not.toContain('Anna');
    expect(texts('result-vote-name')).toEqual(['Ben']);
    expect(all('result-empty')).toHaveLength(0);
  });

  it('shows no not voted line when every developer voted', async () => {
    await open(
      withTeam(
        revealedScrumMaster,
        [developer('Ben'), developer('Cem')],
        [
          { name: 'Ben', card: '5' },
          { name: 'Cem', card: '8' },
        ],
      ),
    );

    expect(all('not-voted')).toHaveLength(0);
  });

  it('shows the empty state and every developer when nobody voted', async () => {
    await open(withTeam(revealedDeveloper, [developer('Ben'), developer('Cem')], []));

    expect(texts('result-empty')).toEqual(['Keine Karten abgegeben.']);
    expect(all('result-vote')).toHaveLength(0);
    expect(texts('not-voted')).toEqual(['Nicht geschätzt: Ben, Cem']);
  });

  it('names the number of votes and the turnout in the consensus hint', async () => {
    const team = ['Ben', 'Cem', 'Dana', 'Eva', 'Finn'].map((name) => developer(name));
    await open(
      withTeam(revealedDeveloper, team, [
        { name: 'Ben', card: '5' },
        { name: 'Cem', card: '5' },
        { name: 'Dana', card: '5' },
      ]),
    );

    expect(texts('consensus-hint')).toEqual(['Konsens: Alle 3 abgegebenen Stimmen zeigen 5.']);
    expect(texts('turnout-hint')).toEqual(['3 von 5 Entwicklern haben geschätzt.']);
    expect(all('consensus-confetti')).toHaveLength(1);
  });

  it('shows no turnout when every developer voted for the consensus', async () => {
    const team = ['Ben', 'Cem', 'Dana'].map((name) => developer(name));
    await open(
      withTeam(revealedDeveloper, team, [
        { name: 'Ben', card: '5' },
        { name: 'Cem', card: '5' },
        { name: 'Dana', card: '5' },
      ]),
    );

    expect(texts('consensus-hint')).toEqual(['Konsens: Alle 3 abgegebenen Stimmen zeigen 5.']);
    expect(all('turnout-hint')).toHaveLength(0);
  });
});
