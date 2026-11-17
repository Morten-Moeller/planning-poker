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
} from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { SessionFacts } from './session-facts';

const SESSION_ID = 'K7P2QX9M';

function withDevelopers(snapshot: SessionView, count: number): SessionView {
  const developers = Array.from({ length: count }, (_, index) => ({
    id: `developer-${index}`,
    name: `Entwickler ${index}`,
    role: 'DEVELOPER' as const,
    connected: true,
    hasVoted: false,
  }));
  const scrumMaster = snapshot.participants.filter((p) => p.role === 'SCRUM_MASTER');
  return { ...snapshot, participants: [...scrumMaster, ...developers] };
}

describe('SessionFacts', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let fixture: ComponentFixture<SessionFacts>;

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
    fixture = TestBed.createComponent(SessionFacts);
    await fixture.whenStable();
  }

  function text(id: string): string {
    return (
      (fixture.nativeElement as HTMLElement)
        .querySelector(`[data-testid="${id}"]`)
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? ''
    );
  }

  it('shows six participants with five developers', async () => {
    await open(withDevelopers(lobbyScrumMaster, 5));

    expect(text('session-participants')).toBe('6 (5 Entwickler)');
    expect(text('session-participant-count')).toBe('6');
  });

  it('shows the label Teilnehmer next to the count', async () => {
    await open(withDevelopers(lobbyScrumMaster, 5));

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('dt'),
      (element) => element.textContent?.trim(),
    );
    expect(labels).toEqual(['Session-ID', 'Phase', 'Deine Rolle', 'Teilnehmer']);
  });

  it('shows the session id and the role', async () => {
    await open(lobbyDeveloper);

    expect(text('session-id')).toBe(SESSION_ID);
    expect(text('session-role')).toBe('Entwickler');
  });

  it.each([
    [lobbyDeveloper, 'Wartet auf ein Issue'],
    [discussionDeveloper, 'Diskussion'],
    [votingDeveloper, 'Runde läuft'],
    [revealedDeveloper, 'Runde aufgelöst'],
  ])('shows the phase %#', async (snapshot, phase) => {
    await open(snapshot);

    expect(text('session-phase')).toBe(phase);
  });
});
