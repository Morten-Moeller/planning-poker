import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StartPage } from './start-page';

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

describe('StartPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows title and lead and that the backend is reachable', async () => {
    const calls = stubBackend(up);

    render(<StartPage />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Issues gemeinsam schätzen');
    expect(screen.getByTestId('health-status').textContent).toBe('Backend wird geprüft …');
    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend erreichbar'),
    );
    expect(calls).toEqual(['/api/health']);
    expect(screen.queryByTestId('health-down')).toBeNull();
    const footer = screen.getByTestId('start-footer');
    expect(footer.contains(screen.getByTestId('health-status'))).toBe(true);
  });

  it.each([
    { name: 'the call fails', answer: unreachable },
    { name: 'the backend answers 503', answer: down },
  ])('shows the alert with the retry button when $name', async ({ answer }) => {
    stubBackend(answer);

    render(<StartPage />);

    const alert = await screen.findByTestId('health-down');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain(
      'Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.',
    );
    expect(screen.getByTestId('health-status').textContent).toBe('Backend nicht erreichbar');
    const retry = screen.getByTestId('health-retry');
    expect(retry.tagName).toBe('BUTTON');
    expect(retry.getAttribute('data-slot')).toBe('button');
    expect(retry.textContent).toContain('Erneut prüfen');
  });

  it('asks again with a click on retry and removes the alert after an answer 200', async () => {
    const user = userEvent.setup();
    const calls = stubBackend(unreachable, up);
    render(<StartPage />);

    await user.click(await screen.findByTestId('health-retry'));

    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend erreichbar'),
    );
    expect(calls).toEqual(['/api/health', '/api/health']);
    expect(screen.queryByTestId('health-down')).toBeNull();
  });

  it('keeps the alert while the retry runs and after it failed again', async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => undefined;
    const held: Answer = () => new Promise<Response>((resolve) => (release = resolve));
    stubBackend(unreachable, held);
    render(<StartPage />);

    await user.click(await screen.findByTestId('health-retry'));

    expect(screen.getByTestId('health-status').textContent).toBe('Backend wird geprüft …');
    expect(screen.getByTestId('health-down')).toBeTruthy();
    release(Response.json({ status: 'DOWN' }, { status: 503 }));
    await waitFor(() =>
      expect(screen.getByTestId('health-status').textContent).toBe('Backend nicht erreichbar'),
    );
    expect(screen.getByTestId('health-down')).toBeTruthy();
  });
});
