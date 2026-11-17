import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import {
  SessionView,
  discussionDeveloper,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { ParticipantList } from './participant-list';

const SESSION_ID = 'K7P2QX9M';

function withVotes(snapshot: SessionView, voted: string[]): SessionView {
  return {
    ...snapshot,
    participants: snapshot.participants.map((p) => ({ ...p, hasVoted: voted.includes(p.name) })),
  };
}

function disconnected(snapshot: SessionView, name: string): SessionView {
  return {
    ...snapshot,
    participants: snapshot.participants.map((p) =>
      p.name === name ? { ...p, connected: false } : p,
    ),
  };
}

describe('ParticipantList', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let fixture: ComponentFixture<ParticipantList>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: new FakeSocketFactory().create },
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
    fixture = TestBed.createComponent(ParticipantList);
    await fixture.whenStable();
  }

  function row(name: string): HTMLElement {
    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[data-testid="participant"]',
      ),
    );
    const found = rows.find(
      (element) =>
        element.querySelector('[data-testid="participant-name"]')?.textContent?.trim() === name,
    );
    if (found === undefined) {
      throw new Error(`no participant ${name}`);
    }
    return found;
  }

  function text(element: HTMLElement): string {
    return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function status(name: string): string {
    return text(row(name).querySelector<HTMLElement>('.activity')!);
  }

  function chip(name: string): HTMLElement {
    return row(name).querySelector<HTMLElement>('[data-testid="participant-chip"]')!;
  }

  it('shows the count in the title', async () => {
    await open(lobbyDeveloper);

    expect(
      text(
        (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
          '[data-testid="participant-title"]',
        )!,
      ),
    ).toBe('Teilnehmer · 3');
  });

  it.each([
    ['LOBBY', lobbyDeveloper, 'Bereit'],
    ['DISCUSSION', discussionDeveloper, 'Diskutiert'],
  ])('shows %s as status of a developer without a vote status', async (_, snapshot, expected) => {
    await open(snapshot);

    expect(status('Cem')).toBe(expected);
    expect(row('Cem').querySelector('[data-testid="participant-vote-status"]')).toBeNull();
    expect(chip('Cem').classList).toContain('empty');
  });

  it.each([
    ['VOTING', votingDeveloper, '○ Ausstehend', 'Ausstehend', true],
    ['REVEALED', revealedDeveloper, 'Nicht geschätzt', 'Nicht geschätzt', false],
  ])(
    'shows the vote status in %s with a filled chip for a vote',
    async (_, snapshot, shown, label, pending) => {
      await open(withVotes(snapshot, ['Ben']));

      expect(status('Ben')).toBe('✓ Hat geschätzt');
      expect(chip('Ben').classList).toContain('filled');
      expect(status('Cem')).toBe(shown);
      expect(
        text(row('Cem').querySelector<HTMLElement>('[data-testid="participant-vote-status"]')!),
      ).toBe(label);
      expect(row('Cem').querySelector('.activity')?.classList.contains('pending')).toBe(pending);
      expect(chip('Cem').classList).toContain('empty');
      expect(chip('Cem').classList).not.toContain('filled');
    },
  );

  it.each([
    ['LOBBY', lobbyScrumMaster],
    ['VOTING', votingScrumMaster],
  ])('shows the scrum master in %s with the label and without a chip', async (_, snapshot) => {
    await open(snapshot);

    expect(status('Anna')).toBe('Moderiert, schätzt nicht mit');
    expect(text(row('Anna').querySelector<HTMLElement>('.role')!)).toBe('★ Scrum Master');
    expect(text(row('Anna').querySelector<HTMLElement>('[data-testid="participant-role"]')!)).toBe(
      'Scrum Master',
    );
    expect(chip('Anna').classList).toContain('none');
    expect(row('Anna').querySelector('[data-testid="participant-vote-status"]')).toBeNull();
    expect(row('Ben').querySelector('[data-testid="participant-role"]')).toBeNull();
  });

  it('marks the own row with (du)', async () => {
    await open(lobbyDeveloper);

    expect(row('Ben').classList).toContain('me');
    expect(text(row('Ben').querySelector<HTMLElement>('[data-testid="participant-me"]')!)).toBe(
      '(du)',
    );
    expect(row('Cem').classList).not.toContain('me');
    expect(row('Cem').querySelector('[data-testid="participant-me"]')).toBeNull();
  });

  it('shows the connection as text', async () => {
    await open(disconnected(lobbyDeveloper, 'Cem'));

    expect(text(row('Ben').querySelector<HTMLElement>('.connection')!)).toBe('● verbunden');
    expect(text(row('Cem').querySelector<HTMLElement>('.connection')!)).toBe('○ getrennt');
    expect(row('Cem').classList).toContain('disconnected');
    expect(text(row('Cem').querySelector<HTMLElement>('[data-testid="participant-status"]')!)).toBe(
      'getrennt',
    );
  });
});
