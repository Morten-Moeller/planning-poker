import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/api-error';
import { lobbyDeveloper } from '../api/examples';
import { createTestBackend, renderWithBackend } from '../api/testing/test-backend';
import { ErrorBanner } from './error-banner';

const DETAIL = 'Internal detail text of the API.';
const KEPT = 'Deine Karte bleibt erhalten.';

const TEXTS: [string, string][] = [
  ['VALIDATION_ERROR', 'Die Eingabe ist ungültig.'],
  ['INVALID_CARD', 'Diese Karte gibt es nicht.'],
  ['UNAUTHORIZED', 'Der Zugang zur Sitzung ist nicht mehr gültig.'],
  ['FORBIDDEN_ROLE', 'Diese Aktion ist für Ihre Rolle nicht erlaubt.'],
  ['INVITE_INVALID', 'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.'],
  ['PROJECT_NOT_ALLOWED', 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.'],
  ['SESSION_NOT_FOUND', 'Die Sitzung wurde nicht gefunden oder ist abgelaufen.'],
  ['ISSUE_NOT_FOUND', 'Das Issue wurde im GitLab-Projekt nicht gefunden.'],
  ['PROJECT_NOT_FOUND', 'Das GitLab-Projekt wurde nicht gefunden.'],
  ['NAME_TAKEN', 'Der Name ist in dieser Sitzung schon vergeben.'],
  ['INVALID_STATE', 'Die Aktion passt nicht zum aktuellen Stand der Sitzung.'],
  ['LIMIT_REACHED', 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.'],
  [
    'GITLAB_ACCESS_DENIED',
    'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  ],
  ['GITLAB_ERROR', 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.'],
  ['SOMETHING_NEW', 'Es ist ein Fehler aufgetreten.'],
];

function setup() {
  const test = createTestBackend();
  const view = renderWithBackend(<ErrorBanner />, test.backend);
  return { ...test, container: view.container };
}

describe('ErrorBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing without an error and with an open connection', () => {
    const { container } = setup();

    expect(container.textContent).toBe('');
  });

  it.each(TEXTS)('shows the German text for %s and never the detail', (code, text) => {
    const { backend, container } = setup();

    act(() => backend.errors.report(new ApiError(code, 409, DETAIL)));

    expect(screen.getByTestId('error-banner').getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('error-message').textContent).toBe(text);
    expect(container.textContent).not.toContain(DETAIL);
  });

  it('clears the error state and hides the banner with „Schließen“', () => {
    const { backend } = setup();
    act(() => backend.errors.report(new ApiError('NAME_TAKEN', 409, DETAIL)));
    const close = screen.getByTestId('error-close');
    expect(close.tagName).toBe('BUTTON');
    expect(close.getAttribute('data-slot')).toBe('button');
    expect(close.textContent).toBe('Schließen');

    fireEvent.click(close);

    expect(screen.queryByTestId('error-banner')).toBeNull();
    expect(backend.errors.error()).toBeNull();
  });

  describe('lost connection', () => {
    function connected() {
      const test = setup();
      act(() => {
        test.backend.realtime.connect(
          'K7P2QX9M',
          'token',
          () => undefined,
          () => undefined,
        );
        test.sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });
      });
      return test;
    }

    it('shows no banner while the first connection is built and while it is open', () => {
      connected();

      expect(screen.queryByTestId('connection-banner')).toBeNull();
    });

    it('counts the seconds down to the next attempt and keeps the text of another error', () => {
      const { backend, sockets } = connected();

      act(() => sockets.last().drop());
      act(() => vi.advanceTimersByTime(1_000));
      act(() => sockets.last().drop());
      act(() => backend.errors.report(new ApiError('INVALID_STATE', 409, DETAIL)));

      const banner = screen.getByTestId('connection-banner');
      expect(banner.getAttribute('role')).toBe('alert');
      expect(banner.textContent).toContain('⚠ Verbindung zum Server unterbrochen.');
      expect(banner.querySelector('.app-symbol')?.getAttribute('aria-hidden')).toBe('true');
      expect(screen.getByTestId('connection-retry').textContent).toBe(
        `Neuer Versuch in 2 s. ${KEPT}`,
      );
      expect(screen.getByTestId('error-message').textContent).toBe(
        'Die Aktion passt nicht zum aktuellen Stand der Sitzung.',
      );
      const reconnect = screen.getByTestId('connection-reconnect') as HTMLButtonElement;
      expect(reconnect.getAttribute('data-slot')).toBe('button');
      expect(reconnect.textContent).toBe('Jetzt verbinden');
      expect(reconnect.disabled).toBe(false);

      act(() => vi.advanceTimersByTime(1_000));

      expect(screen.getByTestId('connection-retry').textContent).toBe(
        `Neuer Versuch in 1 s. ${KEPT}`,
      );
    });

    it('shows that the connection is built and locks the button at the attempt', () => {
      const { sockets } = connected();
      act(() => sockets.last().drop());

      act(() => vi.advanceTimersByTime(1_000));

      expect(sockets.sockets).toHaveLength(2);
      expect(screen.getByTestId('connection-retry').textContent).toBe(
        `Verbindung wird aufgebaut … ${KEPT}`,
      );
      expect((screen.getByTestId('connection-reconnect') as HTMLButtonElement).disabled).toBe(true);
    });

    it('connects at once with „Jetzt verbinden“ and hides the banner with the next snapshot', () => {
      const { sockets } = connected();
      act(() => sockets.last().drop());
      expect(sockets.sockets).toHaveLength(1);

      fireEvent.click(screen.getByTestId('connection-reconnect'));

      expect(sockets.sockets).toHaveLength(2);
      expect(screen.getByTestId('connection-banner')).toBeTruthy();
      expect((screen.getByTestId('connection-reconnect') as HTMLButtonElement).disabled).toBe(true);
      act(() => sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper }));
      expect(screen.queryByTestId('connection-banner')).toBeNull();
    });
  });
});
