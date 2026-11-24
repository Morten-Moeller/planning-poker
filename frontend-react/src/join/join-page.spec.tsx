import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RECENT_SESSIONS_KEY } from '../api/recent-sessions';
import { createTestBackend, problem, renderWithBackend } from '../api/testing/test-backend';
import type { Answer } from '../api/testing/test-backend';
import { JoinPage } from './join-page';

const ID = 'K7P2QX9M';
const INVITE = 'q3Vx8LkP0aZ1bC2dE3fG4hI5jK6lM7nO';
const JOINED = { participantId: '01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90', token: 'token-of-ben' };
const DEVELOPER_PATH = `/session/${ID}/join?invite=${INVITE}`;
const VIEWER_PATH = `${DEVELOPER_PATH}&as=viewer`;
const JOIN_CALL = `POST /api/sessions/${ID}/participants`;

function Path() {
  const { pathname, search } = useLocation();
  return <p data-testid="path">{pathname + search}</p>;
}

function setup(path: string, answer: Answer = () => Response.json(JOINED, { status: 201 })) {
  const test = createTestBackend((call) =>
    call.url === '/api/config' ? Response.json({ rememberSessions: true }) : answer(call),
  );
  const view = renderWithBackend(
    <Routes>
      <Route path="session/:id/join" element={<JoinPage />} />
      <Route path="*" element={<Path />} />
    </Routes>,
    test.backend,
    path,
  );
  const joinCalls = () => test.calls.filter((call) => call.url !== '/api/config');
  return { ...test, joinCalls, container: view.container, user: userEvent.setup() };
}

function nameField() {
  return screen.getByTestId('join-name') as HTMLInputElement;
}

function submitButton() {
  return screen.getByTestId('join-submit') as HTMLButtonElement;
}

async function joinAs(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.clear(nameField());
  if (name !== '') {
    await user.type(nameField(), name);
  }
  await user.click(submitButton());
}

describe('JoinPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows the large card hand centred above the title', () => {
    setup(DEVELOPER_PATH);

    const hand = screen.getByTestId('card-hand');
    const title = screen.getByRole('heading', { level: 1 });
    expect(hand.getAttribute('data-size')).toBe('large');
    expect(title.textContent).toBe('Mit welchem Namen?');
    expect(hand.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('shows the hint for a developer and the form with the name field', () => {
    setup(DEVELOPER_PATH);

    expect(screen.getByTestId('join-role-hint').textContent).toBe(
      'Du trittst als Entwickler bei. Der Name ist für alle sichtbar.',
    );
    expect(screen.queryByTestId('join-viewer-hint')).toBeNull();
    expect(screen.getByTestId('join-form').tagName).toBe('FORM');
    expect(screen.getByLabelText('Name')).toBe(nameField());
    expect(nameField().getAttribute('autocomplete')).toBe('name');
    expect(nameField().value).toBe('');
    expect(screen.getByText('Höchstens 30 Zeichen')).toBeTruthy();
    expect(submitButton().textContent).toBe('Beitreten');
    expect(submitButton().getAttribute('type')).toBe('submit');
    expect(submitButton().getAttribute('data-variant')).toBe('filled');
    expect(submitButton().disabled).toBe(false);
  });

  it('shows the hint for a viewer with as=viewer', () => {
    setup(VIEWER_PATH);

    expect(screen.getByTestId('join-viewer-hint').textContent).toBe(
      'Du trittst als Zuschauer bei. Du siehst die Runde, schätzt aber nicht mit.',
    );
    expect(screen.queryByTestId('join-role-hint')).toBeNull();
    expect(screen.getByTestId('join-form')).toBeTruthy();
  });

  it('shows the hint for a developer with another value of as', () => {
    setup(`${DEVELOPER_PATH}&as=scrum-master`);

    expect(screen.getByTestId('join-role-hint')).toBeTruthy();
    expect(screen.queryByTestId('join-viewer-hint')).toBeNull();
  });

  it('fills the name field with the remembered name', () => {
    localStorage.setItem('planningpoker.preferences', JSON.stringify({ name: 'Ben' }));

    setup(DEVELOPER_PATH);

    expect(nameField().value).toBe('Ben');
  });

  it.each([
    { name: 'no invite', path: `/session/${ID}/join` },
    { name: 'an empty invite', path: `/session/${ID}/join?invite=` },
    { name: 'an invite of spaces', path: `/session/${ID}/join?invite=%20%20` },
    { name: 'no invite as a viewer', path: `/session/${ID}/join?as=viewer` },
  ])('shows that the invite link is missing with $name', ({ path }) => {
    setup(path);

    const missing = screen.getByTestId('join-invite-missing');
    expect(missing.textContent).toBe(
      'Zum Beitreten brauchst du einen Einladungslink vom Scrum Master.',
    );
    expect(missing.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mit welchem Namen?');
    expect(screen.queryByTestId('join-form')).toBeNull();
    expect(screen.queryByTestId('join-role-hint')).toBeNull();
    expect(screen.queryByTestId('join-viewer-hint')).toBeNull();
  });

  it.each([
    { name: 'an empty name', value: '', text: 'Bitte einen Namen eingeben' },
    { name: 'a name of spaces', value: '   ', text: 'Bitte einen Namen eingeben' },
    {
      name: 'a name of 31 characters',
      value: 'a'.repeat(31),
      text: 'Der Name darf höchstens 30 Zeichen haben',
    },
  ])('shows an error and sends nothing for $name', async ({ value, text }) => {
    const { joinCalls, user } = setup(DEVELOPER_PATH);
    expect(screen.queryByTestId('join-name-error')).toBeNull();

    await joinAs(user, value);

    expect(screen.getByTestId('join-name-error').textContent).toContain(text);
    expect(nameField().getAttribute('aria-invalid')).toBe('true');
    expect(joinCalls()).toEqual([]);
    expect(screen.queryByTestId('path')).toBeNull();
  });

  it('accepts a name of 30 characters', async () => {
    const { joinCalls, user } = setup(DEVELOPER_PATH);

    await joinAs(user, 'a'.repeat(30));

    await screen.findByTestId('path');
    expect(joinCalls()).toHaveLength(1);
  });

  it.each([
    { name: 'a developer', path: DEVELOPER_PATH, role: 'DEVELOPER' },
    { name: 'a viewer', path: VIEWER_PATH, role: 'VIEWER' },
  ])(
    'joins as $name, stores the access and the name and opens the room',
    async ({ path, role }) => {
      const { backend, joinCalls, user } = setup(path);
      await act(() => backend.loadSetting());

      await joinAs(user, '  Ben  ');

      expect((await screen.findByTestId('path')).textContent).toBe(`/session/${ID}`);
      const calls = joinCalls();
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([JOIN_CALL]);
      expect(calls[0]?.body).toEqual({ name: 'Ben', invite: INVITE });
      expect(calls[0]?.headers['Authorization']).toBeUndefined();
      expect(backend.tokens.identity(ID)).toEqual(JOINED);
      expect(JSON.parse(sessionStorage.getItem(`planningpoker.session.${ID}`) ?? 'null')).toEqual(
        JOINED,
      );
      expect(backend.recent.find(ID)).toMatchObject({
        ...JOINED,
        sessionId: ID,
        role,
        name: 'Ben',
      });
      expect(backend.preferences.read().name).toBe('Ben');
      expect(backend.errors.error()).toBeNull();
    },
  );

  it('writes no recent session when the setting is off', async () => {
    const { backend, user } = setup(DEVELOPER_PATH);

    await joinAs(user, 'Ben');

    await screen.findByTestId('path');
    expect(backend.tokens.identity(ID)).toEqual(JOINED);
    expect(localStorage.getItem(RECENT_SESSIONS_KEY)).toBeNull();
  });

  it('takes the session id of the path in capital letters', async () => {
    const { joinCalls, backend, user } = setup(`/session/k7p2qx9m/join?invite=${INVITE}`);

    await joinAs(user, 'Ben');

    expect((await screen.findByTestId('path')).textContent).toBe(`/session/${ID}`);
    expect(joinCalls().map((call) => `${call.method} ${call.url}`)).toEqual([JOIN_CALL]);
    expect(backend.tokens.identity(ID)).toEqual(JOINED);
  });

  it('locks the button while the call runs and sends one request', async () => {
    let answerJoin: (response: Response) => void = () => undefined;
    const { joinCalls, user } = setup(
      DEVELOPER_PATH,
      () => new Promise<Response>((resolve) => (answerJoin = resolve)),
    );

    await joinAs(user, 'Ben');

    await waitFor(() => expect(submitButton().disabled).toBe(true));
    await user.type(nameField(), '{Enter}');
    expect(joinCalls()).toHaveLength(1);

    await act(async () => answerJoin(problem(409, 'NAME_TAKEN')));

    await waitFor(() => expect(submitButton().disabled).toBe(false));
  });

  it('shows session not found in place of the form and the role hint', async () => {
    const { backend, user } = setup(DEVELOPER_PATH, () => problem(404, 'SESSION_NOT_FOUND'));

    await joinAs(user, 'Ben');

    const notFound = await screen.findByTestId('join-not-found');
    expect(notFound.getAttribute('role')).toBe('alert');
    expect(notFound.textContent).toContain('Sitzung nicht gefunden');
    expect(notFound.textContent).toContain('Der Link ist abgelaufen oder falsch.');
    const home = screen.getByTestId('join-not-found-home');
    expect(home.textContent).toBe('Zur Startseite');
    expect(home.getAttribute('href')).toBe('/');
    expect(screen.queryByTestId('join-form')).toBeNull();
    expect(screen.queryByTestId('join-role-hint')).toBeNull();
    expect(backend.errors.error()).toBeNull();
    expect(backend.tokens.identity(ID)).toBeNull();
  });

  it('shows the invalid invite in place of the form and the role hint', async () => {
    const { backend, user } = setup(VIEWER_PATH, () => problem(403, 'INVITE_INVALID'));

    await joinAs(user, 'Ben');

    const invalid = await screen.findByTestId('join-invite-invalid');
    expect(invalid.textContent).toBe(
      'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
    );
    expect(invalid.closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByTestId('join-form')).toBeNull();
    expect(screen.queryByTestId('join-viewer-hint')).toBeNull();
    expect(backend.errors.error()).toBeNull();
    expect(backend.tokens.identity(ID)).toBeNull();
  });

  it('shows a taken name at the field until the name changes', async () => {
    const { backend, user } = setup(DEVELOPER_PATH, () => problem(409, 'NAME_TAKEN'));

    await joinAs(user, 'Anna');

    const error = await screen.findByTestId('join-error');
    expect(error.textContent).toContain('Der Name ist in dieser Sitzung schon vergeben.');
    expect(nameField().getAttribute('aria-describedby')).toContain(error.id);
    expect(nameField().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('join-form')).toBeTruthy();
    expect(screen.getByTestId('join-role-hint')).toBeTruthy();
    expect(backend.errors.error()).toBeNull();
    expect(backend.preferences.read().name).toBe('');

    await user.type(nameField(), '2');

    expect(screen.queryByTestId('join-error')).toBeNull();
    expect(nameField().getAttribute('aria-invalid')).not.toBe('true');
  });

  it.each([
    ['LIMIT_REACHED', 429, 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.'],
    ['VALIDATION_ERROR', 400, 'Die Eingabe ist ungültig.'],
  ])('shows %s as an error note above the field', async (code, status, text) => {
    const { backend, container, user } = setup(DEVELOPER_PATH, () => problem(status, code));

    await joinAs(user, 'Ben');

    const error = await screen.findByTestId('join-error');
    expect(error.textContent).toBe(text);
    const note = error.closest('[role="alert"]');
    expect(note).not.toBeNull();
    const position = note?.compareDocumentPosition(nameField()) ?? 0;
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByTestId('join-form').contains(note)).toBe(true);
    expect(nameField().getAttribute('aria-invalid')).not.toBe('true');
    expect(container.textContent).not.toContain('Detail of the API.');
    expect(backend.errors.error()).toBeNull();
  });

  it('removes the error note with the next attempt', async () => {
    let attempt = 0;
    const { user } = setup(DEVELOPER_PATH, () => {
      attempt += 1;
      return attempt === 1 ? problem(429, 'LIMIT_REACHED') : Response.json(JOINED, { status: 201 });
    });
    await joinAs(user, 'Ben');
    await screen.findByTestId('join-error');

    await user.click(submitButton());

    expect((await screen.findByTestId('path')).textContent).toBe(`/session/${ID}`);
  });

  it.each([
    ['GITLAB_ERROR', 502],
    ['UNAUTHORIZED', 401],
    ['SOMETHING_NEW', 500],
  ])('leaves %s in the error state for the banner and keeps the form', async (code, status) => {
    const { backend, user } = setup(DEVELOPER_PATH, () => problem(status, code));

    await joinAs(user, 'Ben');

    await waitFor(() => expect(backend.errors.error()?.errorCode).toBe(code));
    await waitFor(() => expect(submitButton().disabled).toBe(false));
    expect(screen.getByTestId('join-form')).toBeTruthy();
    expect(screen.getByTestId('join-role-hint')).toBeTruthy();
    expect(screen.queryByTestId('join-error')).toBeNull();
    expect(screen.queryByTestId('join-not-found')).toBeNull();
    expect(screen.queryByTestId('join-invite-invalid')).toBeNull();
    expect(backend.tokens.identity(ID)).toBeNull();
  });

  it('keeps the form after a failure of the network', async () => {
    const { backend, user } = setup(DEVELOPER_PATH, () => {
      throw new TypeError('Failed to fetch');
    });

    await joinAs(user, 'Ben');

    await waitFor(() => expect(submitButton().disabled).toBe(false));
    expect(screen.getByTestId('join-form')).toBeTruthy();
    expect(backend.errors.error()).toBeNull();
    expect(backend.tokens.identity(ID)).toBeNull();
  });
});
