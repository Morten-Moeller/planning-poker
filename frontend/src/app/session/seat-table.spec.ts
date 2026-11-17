import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { revealedScrumMaster, SessionView, votingDeveloper } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { Card } from './cards';
import { SeatTable } from './seat-table';

const SESSION_ID = 'K7P2QX9M';

type Participant = SessionView['participants'][number];

function developer(name: string, connected: boolean, hasVoted: boolean): Participant {
  return { id: `id-${name.toLowerCase()}`, name, role: 'DEVELOPER', connected, hasVoted };
}

const TEAM = [
  developer('Ben', true, true),
  developer('Cem', true, false),
  developer('Dana', true, true),
  developer('Finn', false, false),
];

function voting(): SessionView {
  return {
    ...votingDeveloper,
    me: { ...votingDeveloper.me, participantId: 'id-ben' },
    participants: [votingDeveloper.participants[0], ...TEAM],
    round: { ...votingDeveloper.round!, myVote: '8', votes: null, stats: null },
  };
}

function revealed(votes: [string, Card][]): SessionView {
  return {
    ...revealedScrumMaster,
    participants: [revealedScrumMaster.participants[0], ...TEAM],
    round: {
      ...revealedScrumMaster.round!,
      votes: votes.map(([name, card]) => ({
        participantId: `id-${name.toLowerCase()}`,
        name,
        card,
      })),
    },
  };
}

describe('SeatTable', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<SeatTable>;

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
    fixture = TestBed.createComponent(SeatTable);
    await fixture.whenStable();
  }

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texts(selector: string): string[] {
    return Array.from(root().querySelectorAll(selector)).map(
      (node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  }

  it('shows a seat per developer with the vote status while the round runs', async () => {
    await open(voting());

    expect(texts('[data-testid="seat-table-title"]')).toEqual(['AM TISCH · VERDECKT']);
    expect(texts('[data-testid="seat-name"]')).toEqual(['Ben', 'Cem', 'Dana', 'Finn']);
    expect(texts('[data-testid="seat-status"]')).toEqual([
      '✓ geschätzt',
      'ausstehend',
      '✓ geschätzt',
      'getrennt',
    ]);
    expect(texts('[data-testid="seat-card"]')).toEqual(['', '…', '', 'getrennt']);
    expect(root().querySelectorAll('[data-testid="seat-card"].hidden')).toHaveLength(2);
  });

  it('puts no card value into the DOM while the round runs, not even the own one', async () => {
    await open(voting());

    expect(root().querySelectorAll('.value, .glyph')).toHaveLength(0);
    expect(root().querySelectorAll('[data-testid="result-vote"]')).toHaveLength(0);
    expect(root().textContent).not.toContain('8');
  });

  it('shows every card value after the reveal and marks the outliers', async () => {
    await open(
      revealed([
        ['Ben', '1'],
        ['Dana', '13'],
        ['Cem', '3'],
      ]),
    );

    expect(texts('[data-testid="seat-table-title"]')).toEqual(['AUFGEDECKT']);
    expect(texts('[data-testid="result-vote-name"]')).toEqual(['Ben', 'Cem', 'Dana']);
    expect(texts('[data-testid="result-vote-card"]')).toEqual(['1', '3', '13']);
    expect(
      Array.from(root().querySelectorAll('[data-testid="result-vote"]'))
        .filter((seat) => seat.querySelector('[data-testid="result-vote-outlier"]') !== null)
        .map((seat) => seat.querySelector('[data-testid="result-vote-name"]')?.textContent),
    ).toEqual(['Ben', 'Dana']);
    expect(texts('[data-testid="seat-name"]')).toEqual(['Finn']);
    expect(texts('[data-testid="seat-status"]')).toEqual(['getrennt']);
  });

  it('keeps the seat of a developer who left after the vote', async () => {
    await open(
      revealed([
        ['Ben', '5'],
        ['Zoe', '8'],
      ]),
    );

    expect(texts('[data-testid="result-vote-name"]')).toEqual(['Ben', 'Zoe']);
    expect(texts('[data-testid="seat-status"]')).toEqual([
      'nicht geschätzt',
      'nicht geschätzt',
      'getrennt',
    ]);
  });
});
