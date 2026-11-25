import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { lobbyScrumMaster } from '../api/examples';
import { createTestBackend, renderWithBackend } from '../api/testing/test-backend';
import { StartPage } from './start-page';
import { installPopupAnimations } from './testing/popup-animations';

type Answer = () => Promise<Response>;

const up: Answer = () => Promise.resolve(Response.json({ status: 'UP' }));
const down: Answer = () => Promise.resolve(Response.json({ status: 'DOWN' }, { status: 503 }));
const unreachable: Answer = () => Promise.reject(new TypeError('Failed to fetch'));

function stubBackend(...answers: Answer[]) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    calls.push(String(input));
    const answer = answers[Math.min(calls.length, answers.length) - 1];
    return answer === undefined ? unreachable() : answer();
  });
  return calls;
}

function show() {
  const test = createTestBackend((call) =>
    call.url === '/api/config'
      ? Response.json({ rememberSessions: true })
      : Response.json(lobbyScrumMaster),
  );
  renderWithBackend(<StartPage />, test.backend);
  return test;
}

function follows(first: HTMLElement, second: HTMLElement): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('StartPage', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows title and lead and that the backend is reachable', async () => {
    const calls = stubBackend(up);

    show();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Issues gemeinsam schätzen');
    expect(screen.getByTestId('health-status').textContent).toBe('Backend wird geprüft …');
    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend erreichbar'),
    );
    expect(calls).toEqual(['/api/health']);
    expect(screen.queryByTestId('health-down')).toBeNull();
    const footer = screen.getByTestId('start-footer');
    expect(footer.contains(screen.getByTestId('health-status'))).toBe(true);
    const submit = screen.getByTestId<HTMLButtonElement>('create-submit');
    expect(submit.disabled).toBe(false);
    expect(submit.textContent).toBe('Sitzung erstellen');
  });

  it('shows card hand, title, lead, form and footer in this order', async () => {
    stubBackend(up);

    show();

    const page = screen.getByTestId('start-page');
    const parts = [
      screen.getByTestId('card-hand'),
      screen.getByRole('heading', { level: 1 }),
      screen.getByTestId('start-lead'),
      screen.getByTestId('create-form'),
      screen.getByTestId('start-footer'),
    ];
    expect(parts.every((part) => page.contains(part))).toBe(true);
    parts.slice(1).forEach((part, index) => {
      expect(follows(parts[index] as HTMLElement, part)).toBe(true);
    });
    expect(screen.getByTestId('card-hand').getAttribute('data-size')).toBe('large');
    expect(screen.getByTestId('start-lead').textContent).toBe(
      'Der Scrum Master erstellt die Sitzung und teilt den Link. Das Team tritt mit Namen bei und schätzt verdeckt.',
    );
    expect(page.lastElementChild).toBe(screen.getByTestId('start-footer'));
    const status = screen.getByTestId('health');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.contains(screen.getByTestId('health-status'))).toBe(true);
    expect(screen.queryByTestId('recent-sessions')).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend erreichbar'),
    );
  });

  it('shows the recent sessions between the lead and the form', async () => {
    stubBackend(up);
    const test = createTestBackend((call) =>
      call.url === '/api/config'
        ? Response.json({ rememberSessions: true })
        : Response.json(lobbyScrumMaster),
    );
    await test.backend.loadSetting();
    test.backend.tokens.store(
      lobbyScrumMaster.sessionId,
      { participantId: lobbyScrumMaster.me.participantId, token: 'token-of-anna' },
      { role: 'SCRUM_MASTER', name: 'Anna' },
    );

    renderWithBackend(<StartPage />, test.backend);

    const recent = await screen.findByTestId('recent-sessions');
    expect(within(recent).getByTestId('recent-session-id').textContent).toBe(
      lobbyScrumMaster.sessionId,
    );
    expect(follows(screen.getByTestId('start-lead'), recent)).toBe(true);
    expect(follows(recent, screen.getByTestId('create-form'))).toBe(true);
  });

  it.each([
    { name: 'the call fails', answer: unreachable },
    { name: 'the backend answers 503', answer: down },
  ])('shows the alert with the retry button when $name', async ({ answer }) => {
    stubBackend(answer);

    show();

    const alert = await screen.findByTestId('health-down');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain(
      'Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.',
    );
    expect(screen.getByTestId('health-status').textContent).toBe('Backend nicht erreichbar');
    const retry = screen.getByTestId('health-retry');
    expect(retry.tagName).toBe('BUTTON');
    expect(retry.getAttribute('data-slot')).toBe('button');
    expect(retry.getAttribute('data-variant')).toBe('outlined');
    expect(retry.getAttribute('data-tone')).toBe('on-error');
    expect(retry.textContent).toContain('Erneut prüfen');
    const submit = screen.getByTestId<HTMLButtonElement>('create-submit');
    expect(submit.disabled).toBe(true);
    expect(submit.textContent).toBe('Sitzung erstellen (Backend fehlt)');
  });

  it('asks again with a click on retry and removes the alert after an answer 200', async () => {
    const user = userEvent.setup();
    const calls = stubBackend(unreachable, up);
    show();

    await user.click(await screen.findByTestId('health-retry'));

    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend erreichbar'),
    );
    expect(calls).toEqual(['/api/health', '/api/health']);
    expect(screen.queryByTestId('health-down')).toBeNull();
    const submit = screen.getByTestId<HTMLButtonElement>('create-submit');
    expect(submit.disabled).toBe(false);
    expect(submit.textContent).toBe('Sitzung erstellen');
  });

  it('keeps the alert while the retry runs and after it failed again', async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => undefined;
    const held: Answer = () => new Promise<Response>((resolve) => (release = resolve));
    stubBackend(unreachable, held);
    show();

    await user.click(await screen.findByTestId('health-retry'));

    expect(screen.getByTestId('health-status').textContent).toBe('Backend wird geprüft …');
    expect(screen.getByTestId('health-down')).toBeTruthy();
    expect(screen.getByTestId<HTMLButtonElement>('create-submit').disabled).toBe(true);
    release(Response.json({ status: 'DOWN' }, { status: 503 }));
    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend nicht erreichbar'),
    );
    expect(screen.getByTestId('health-down')).toBeTruthy();
  });
});
