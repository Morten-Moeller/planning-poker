import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ErrorCode } from '../api/api-error';
import { createTestBackend, problem, renderWithBackend } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import { CreateForm } from './create-form';
import { installPopupAnimations } from './testing/popup-animations';

const SESSION_ID = 'K7P2QX9M';
const CREATED = {
  sessionId: SESSION_ID,
  participantId: '01973f5e-2a4b-7c1d-8e2f-3a4b5c6d7e8f',
  token: 'token-of-anna',
};
const PROJECT = {
  id: 1234,
  name: 'Planning Poker Test',
  pathWithNamespace: 'group/project',
  webUrl: 'https://gitlab.example/group/project',
};
const ISSUES = [
  {
    iid: 43,
    title: 'Password reset',
    webUrl: 'https://gitlab.example/group/project/-/issues/43',
    weight: null,
  },
  {
    iid: 42,
    title: 'Login page',
    webUrl: 'https://gitlab.example/group/project/-/issues/42',
    weight: 3,
  },
];
const LONG_NAME = 'A'.repeat(31);
const NAME_REQUIRED = 'Bitte einen Namen eingeben';

function created(): Response {
  return Response.json(CREATED, { status: 201 });
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function isCreate(call: FetchCall): boolean {
  return call.method === 'POST' && call.url === '/api/sessions';
}

function isProjectSearch(call: FetchCall): boolean {
  return call.url.startsWith('/api/projects') && !call.url.includes('/issues');
}

function isIssueSearch(call: FetchCall): boolean {
  return call.url.includes('/issues');
}

function lists(call: FetchCall): Response {
  return isIssueSearch(call)
    ? Response.json({ items: ISSUES, nextPage: null, total: ISSUES.length })
    : Response.json({ items: [PROJECT], nextPage: null });
}

function backendWith(onCreate: Answer, other: Answer = lists): Answer {
  return (call) => (isCreate(call) ? onCreate(call) : other(call));
}

function Place() {
  return <p data-testid="place">{useLocation().pathname}</p>;
}

function setup(answer: Answer = backendWith(created), backendDown = false) {
  const test = createTestBackend(answer);
  const user = userEvent.setup();
  const show = () =>
    renderWithBackend(
      <Routes>
        <Route index element={<CreateForm backendDown={backendDown} />} />
        <Route path="*" element={<Place />} />
      </Routes>,
      test.backend,
    );
  return { ...test, user, show };
}

function field(testId: string): HTMLInputElement {
  return screen.getByTestId<HTMLInputElement>(testId);
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  values: { name?: string; project?: string; issue?: string },
) {
  const entries = [
    ['create-name', values.name],
    ['create-project', values.project],
    ['create-issue', values.issue],
  ] as const;
  for (const [testId, value] of entries) {
    if (value !== undefined) {
      await user.clear(field(testId));
      if (value !== '') {
        await user.type(field(testId), value);
      }
    }
  }
}

function describedBy(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join('|');
}

function createCalls(calls: FetchCall[]): FetchCall[] {
  return calls.filter(isCreate);
}

describe('CreateForm', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('fields', () => {
    it('shows the heading, the three fields with their hints and the submit button', async () => {
      setup().show();

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Sitzung erstellen');
      expect(screen.getByTestId('create-form').textContent).toContain('Für den Scrum Master');
      const name = screen.getByRole('textbox', { name: 'Dein Name' });
      expect(name.getAttribute('data-testid')).toBe('create-name');
      expect(name.getAttribute('autocomplete')).toBe('name');
      const project = screen.getByRole('combobox', { name: 'GitLab-Projekt' });
      expect(project.getAttribute('data-testid')).toBe('create-project');
      const issue = screen.getByRole('combobox', { name: 'Issue (optional)' });
      expect(issue.getAttribute('data-testid')).toBe('create-issue');
      await waitFor(() =>
        expect(describedBy(project)).toBe('Name, Pfad oder ID. Eingabe von Hand möglich.'),
      );
      expect(describedBy(issue)).toBe('Optional: Issue, mit dem die Sitzung startet');
      const submit = screen.getByTestId<HTMLButtonElement>('create-submit');
      expect(submit.textContent).toBe('Sitzung erstellen');
      expect(submit.type).toBe('submit');
      expect(submit.getAttribute('data-variant')).toBe('filled');
      expect(submit.disabled).toBe(false);
      expect(screen.queryByTestId('create-error')).toBeNull();
    });

    it('fills name and project with the saved values and leaves the issue empty', () => {
      const test = setup();
      test.backend.preferences.save({ name: 'Anna', projectId: '1234' });

      test.show();

      expect(field('create-name').value).toBe('Anna');
      expect(field('create-project').value).toBe('1234');
      expect(field('create-issue').value).toBe('');
    });

    it('starts empty without saved values', () => {
      setup().show();

      expect(field('create-name').value).toBe('');
      expect(field('create-project').value).toBe('');
    });
  });

  describe('validation', () => {
    it.each([
      {
        name: 'an empty name',
        values: { name: '', project: '1234' },
        errorTestId: 'create-name-error',
        text: NAME_REQUIRED,
      },
      {
        name: 'a name of white space',
        values: { name: '   ', project: '1234' },
        errorTestId: 'create-name-error',
        text: NAME_REQUIRED,
      },
      {
        name: 'a name of 31 characters',
        values: { name: LONG_NAME, project: '1234' },
        errorTestId: 'create-name-error',
        text: 'Der Name darf höchstens 30 Zeichen haben',
      },
      {
        name: 'an empty project',
        values: { name: 'Anna', project: '' },
        errorTestId: 'create-project-error',
        text: 'Bitte die GitLab-Projekt-ID eingeben',
      },
      {
        name: 'a project of white space',
        values: { name: 'Anna', project: '  ' },
        errorTestId: 'create-project-error',
        text: 'Bitte die GitLab-Projekt-ID eingeben',
      },
      {
        name: 'the issue 0',
        values: { name: 'Anna', project: '1234', issue: '0' },
        errorTestId: 'create-issue-error',
        text: 'Bitte eine Issue-Nummer ab 1 eingeben',
      },
      {
        name: 'an issue with letters',
        values: { name: 'Anna', project: '1234', issue: 'Login' },
        errorTestId: 'create-issue-error',
        text: 'Bitte eine Issue-Nummer ab 1 eingeben',
      },
      {
        name: 'an issue with a fraction',
        values: { name: 'Anna', project: '1234', issue: '1.5' },
        errorTestId: 'create-issue-error',
        text: 'Bitte eine Issue-Nummer ab 1 eingeben',
      },
      {
        name: 'a negative issue',
        values: { name: 'Anna', project: '1234', issue: '-1' },
        errorTestId: 'create-issue-error',
        text: 'Bitte eine Issue-Nummer ab 1 eingeben',
      },
    ])('sends nothing for $name and shows the error', async ({ values, errorTestId, text }) => {
      const { user, show, calls, backend } = setup();
      show();
      await fill(user, values);

      await user.click(screen.getByTestId('create-submit'));

      expect(screen.getByTestId(errorTestId).textContent).toBe(text);
      expect(createCalls(calls)).toEqual([]);
      expect(backend.tokens.identity(SESSION_ID)).toBeNull();
      expect(screen.queryByTestId('place')).toBeNull();
    });

    it('shows the errors of name and project and none for the empty issue', async () => {
      const { user, show } = setup();
      show();

      await user.click(screen.getByTestId('create-submit'));

      expect(screen.getByTestId('create-name-error').textContent).toBe(NAME_REQUIRED);
      expect(screen.getByTestId('create-project-error').textContent).toBe(
        'Bitte die GitLab-Projekt-ID eingeben',
      );
      expect(screen.queryByTestId('create-issue-error')).toBeNull();
      expect(field('create-name').getAttribute('aria-invalid')).toBe('true');
    });

    it('shows no error before the first submit and removes it with a valid input', async () => {
      const { user, show } = setup();
      show();
      expect(screen.queryByTestId('create-name-error')).toBeNull();
      expect(screen.queryByTestId('create-project-error')).toBeNull();
      await user.click(screen.getByTestId('create-submit'));

      await user.type(field('create-name'), 'Anna');

      expect(screen.queryByTestId('create-name-error')).toBeNull();
    });

    it('shows the error of a field that the user left empty', async () => {
      const { user, show } = setup();
      show();

      await user.click(field('create-name'));
      await user.tab();

      expect(screen.getByTestId('create-name-error').textContent).toBe(NAME_REQUIRED);
      expect(screen.queryByTestId('create-project-error')).toBeNull();
    });
  });

  describe('create', () => {
    it('sends name and project without white space at the ends and no issue for an empty field', async () => {
      const { user, show, calls } = setup();
      show();
      await fill(user, { name: ' Anna ', project: ' 1234 ', issue: '  ' });

      await user.click(screen.getByTestId('create-submit'));

      await waitFor(() => expect(createCalls(calls)).toHaveLength(1));
      expect(createCalls(calls)[0]?.body).toEqual({ name: 'Anna', gitlabProjectId: '1234' });
      expect(createCalls(calls)[0]?.headers['Authorization']).toBeUndefined();
    });

    it('sends the issue as a number when the field is filled', async () => {
      const { user, show, calls } = setup();
      show();
      await fill(user, { name: 'Anna', project: 'group/project', issue: ' 42 ' });

      await user.click(screen.getByTestId('create-submit'));

      await waitFor(() => expect(createCalls(calls)).toHaveLength(1));
      expect(createCalls(calls)[0]?.body).toEqual({
        name: 'Anna',
        gitlabProjectId: 'group/project',
        issueIid: 42,
      });
    });

    it('stores the access as scrum master and the inputs and opens the room', async () => {
      const { user, show, calls, backend } = setup(
        backendWith(created, (call) =>
          call.url === '/api/config' ? Response.json({ rememberSessions: true }) : lists(call),
        ),
      );
      await backend.loadSetting();
      show();
      await fill(user, { name: ' Anna ', project: '1234' });

      await user.click(screen.getByTestId('create-submit'));

      expect((await screen.findByTestId('place')).textContent).toBe(`/session/${SESSION_ID}`);
      expect(backend.tokens.identity(SESSION_ID)).toEqual({
        participantId: CREATED.participantId,
        token: CREATED.token,
      });
      expect(backend.recent.list()).toMatchObject([
        { sessionId: SESSION_ID, role: 'SCRUM_MASTER', name: 'Anna' },
      ]);
      expect(backend.preferences.read()).toMatchObject({ name: 'Anna', projectId: '1234' });
      expect(calls.filter((call) => call.method === 'PUT')).toEqual([]);
    });

    it('sets a saved timer with the new token before it opens the room', async () => {
      const { user, show, calls, backend } = setup(
        backendWith(created, (call) => (call.method === 'PUT' ? noContent() : lists(call))),
      );
      backend.preferences.save({ timerSeconds: 30 });
      show();
      await fill(user, { name: 'Anna', project: '1234' });

      await user.click(screen.getByTestId('create-submit'));

      expect((await screen.findByTestId('place')).textContent).toBe(`/session/${SESSION_ID}`);
      const timerCalls = calls.filter((call) => call.method === 'PUT');
      expect(timerCalls.map((call) => call.url)).toEqual([`/api/sessions/${SESSION_ID}/timer`]);
      expect(timerCalls[0]?.body).toEqual({ seconds: 30 });
      expect(timerCalls[0]?.headers['Authorization']).toBe(`Bearer ${CREATED.token}`);
      expect(backend.preferences.read().timerSeconds).toBe(30);
    });

    it('opens the room when the timer call fails', async () => {
      const { user, show, backend } = setup(
        backendWith(created, (call) =>
          call.method === 'PUT' ? problem(403, 'FORBIDDEN_ROLE') : lists(call),
        ),
      );
      backend.preferences.save({ timerSeconds: 60 });
      show();
      await fill(user, { name: 'Anna', project: '1234' });

      await user.click(screen.getByTestId('create-submit'));

      expect((await screen.findByTestId('place')).textContent).toBe(`/session/${SESSION_ID}`);
    });

    it('locks the button while the call runs and sends one request', async () => {
      let release: (response: Response) => void = () => undefined;
      const { user, show, calls } = setup(
        backendWith(() => new Promise<Response>((resolve) => (release = resolve))),
      );
      show();
      await fill(user, { name: 'Anna', project: '1234' });
      const submit = screen.getByTestId<HTMLButtonElement>('create-submit');

      await user.click(submit);

      await waitFor(() => expect(submit.disabled).toBe(true));
      await user.type(field('create-name'), '{Enter}');
      expect(createCalls(calls)).toHaveLength(1);

      release(created());

      expect((await screen.findByTestId('place')).textContent).toBe(`/session/${SESSION_ID}`);
    });

    it('sends nothing without a backend', async () => {
      const { user, show, calls } = setup(backendWith(created), true);
      show();
      await fill(user, { name: 'Anna', project: '1234' });

      await user.type(field('create-name'), '{Enter}');

      expect(screen.getByTestId<HTMLButtonElement>('create-submit').disabled).toBe(true);
      expect(createCalls(calls)).toEqual([]);
    });
  });

  describe('errors of the call', () => {
    const formErrors: { code: ErrorCode; status: number; text: string }[] = [
      {
        code: 'ISSUE_NOT_FOUND',
        status: 404,
        text: 'Das Issue wurde im GitLab-Projekt nicht gefunden.',
      },
      {
        code: 'PROJECT_NOT_ALLOWED',
        status: 403,
        text: 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.',
      },
      {
        code: 'LIMIT_REACHED',
        status: 429,
        text: 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.',
      },
      {
        code: 'GITLAB_ACCESS_DENIED',
        status: 502,
        text: 'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
      },
      {
        code: 'GITLAB_ERROR',
        status: 502,
        text: 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
      },
      { code: 'VALIDATION_ERROR', status: 400, text: 'Die Eingabe ist ungültig.' },
    ];

    it.each(formErrors)(
      'shows the text of $code above the fields and keeps the inputs',
      async ({ code, status, text }) => {
        const { user, show, backend } = setup(backendWith(() => problem(status, code)));
        show();
        await fill(user, { name: 'Anna', project: '1234', issue: '404' });

        await user.click(screen.getByTestId('create-submit'));

        const error = await screen.findByTestId('create-error');
        expect(error.textContent).toBe(text);
        expect(error.closest('[role="alert"]')).not.toBeNull();
        const form = screen.getByTestId('create-form');
        expect(
          error.compareDocumentPosition(field('create-name')) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(form.contains(error)).toBe(true);
        expect(backend.errors.error()).toBeNull();
        expect(field('create-name').value).toBe('Anna');
        expect(field('create-project').value).toBe('1234');
        expect(field('create-issue').value).toBe('404');
        expect(backend.tokens.identity(SESSION_ID)).toBeNull();
        expect(backend.preferences.read().name).toBe('');
        expect(screen.queryByTestId('place')).toBeNull();
        expect(screen.getByTestId<HTMLButtonElement>('create-submit').disabled).toBe(false);
      },
    );

    it('removes the text above the fields with the next submit', async () => {
      let failing = true;
      const { user, show } = setup(
        backendWith(() => (failing ? problem(404, 'ISSUE_NOT_FOUND') : created())),
      );
      show();
      await fill(user, { name: 'Anna', project: '1234', issue: '404' });
      await user.click(screen.getByTestId('create-submit'));
      await screen.findByTestId('create-error');
      failing = false;

      await user.click(screen.getByTestId('create-submit'));

      await screen.findByTestId('place');
      expect(screen.queryByTestId('create-error')).toBeNull();
    });

    it('shows PROJECT_NOT_FOUND at the project field until the field changes', async () => {
      const { user, show, backend } = setup(backendWith(() => problem(404, 'PROJECT_NOT_FOUND')));
      show();
      await fill(user, { name: 'Anna', project: '999' });

      await user.click(screen.getByTestId('create-submit'));

      const error = await screen.findByTestId('create-project-error');
      expect(error.textContent).toBe('Das GitLab-Projekt wurde nicht gefunden.');
      expect(screen.queryByTestId('create-error')).toBeNull();
      expect(backend.errors.error()).toBeNull();
      expect(field('create-project').value).toBe('999');
      expect(backend.tokens.identity(SESSION_ID)).toBeNull();

      await user.type(field('create-project'), '9');

      expect(screen.queryByTestId('create-project-error')).toBeNull();
    });

    it('leaves another error code to the banner', async () => {
      const { user, show, backend } = setup(backendWith(() => problem(409, 'INVALID_STATE')));
      show();
      await fill(user, { name: 'Anna', project: '1234' });

      await user.click(screen.getByTestId('create-submit'));

      await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('INVALID_STATE'));
      expect(screen.queryByTestId('create-error')).toBeNull();
      expect(screen.queryByTestId('create-project-error')).toBeNull();
      expect(backend.tokens.identity(SESSION_ID)).toBeNull();
      await waitFor(() =>
        expect(screen.getByTestId<HTMLButtonElement>('create-submit').disabled).toBe(false),
      );
    });
  });

  describe('choice of project and issue', () => {
    it('shows the projects with name, path and id and writes the id of the chosen one', async () => {
      const { user, show, calls } = setup();
      show();

      await user.click(field('create-project'));

      const option = await screen.findByTestId('create-project-option');
      expect(calls.filter(isProjectSearch).map((call) => call.url)).toEqual(['/api/projects']);
      expect(option.children[0]?.textContent).toBe('Planning Poker Test');
      expect(option.children[1]?.textContent).toBe('group/project · 1234');

      await user.click(option);

      expect(field('create-project').value).toBe('1234');
    });

    it('searches the projects for the typed text', async () => {
      const { user, show, calls } = setup();
      show();

      await user.type(field('create-project'), 'Plan');

      await waitFor(() =>
        expect(calls.filter(isProjectSearch).map((call) => call.url)).toEqual([
          '/api/projects',
          '/api/projects?search=Plan',
        ]),
      );
      expect(await screen.findByTestId('create-project-option')).toBeTruthy();
    });

    it('shows the issues of the saved project as "#iid Titel" and writes the iid of the chosen one', async () => {
      const test = setup();
      test.backend.preferences.save({ projectId: '1234' });
      test.show();

      await test.user.click(field('create-issue'));

      const options = await screen.findAllByTestId('create-issue-option');
      expect(test.calls.filter(isIssueSearch).map((call) => call.url)).toEqual([
        '/api/projects/1234/issues',
      ]);
      expect(options.map((option) => option.textContent)).toEqual([
        '#43 Password reset',
        '#42 Login page',
      ]);

      await test.user.click(options[0] as HTMLElement);

      expect(field('create-issue').value).toBe('43');
      await waitFor(() => expect(screen.queryAllByTestId('create-issue-option')).toHaveLength(0));
    });

    it('shows the empty texts for answers without entries', async () => {
      const { user, show } = setup(
        backendWith(created, (call) =>
          isIssueSearch(call)
            ? Response.json({ items: [], nextPage: null, total: 0 })
            : Response.json({ items: [], nextPage: null }),
        ),
      );
      show();

      await user.type(field('create-project'), 'kein Treffer');

      expect((await screen.findByTestId('create-project-empty')).textContent).toBe(
        'Keine Projekte gefunden',
      );

      await fill(user, { project: '1234', issue: 'kein Treffer' });

      expect((await screen.findByTestId('create-issue-empty')).textContent).toBe(
        'Keine Issues gefunden',
      );
      expect(screen.queryByTestId('create-project-empty')).toBeNull();
    });

    it('shows the error of the project search below the field and no empty text', async () => {
      const { user, show, backend } = setup(
        backendWith(created, () => problem(502, 'GITLAB_ERROR')),
      );
      show();

      await user.type(field('create-project'), 'Plan');

      const error = await screen.findByTestId('create-project-search-error');
      expect(error.textContent).toBe(
        'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
      );
      expect(error.closest('[role="alert"]')).not.toBeNull();
      expect(screen.queryByTestId('create-project-empty')).toBeNull();
      expect(screen.queryByTestId('create-issue-search-error')).toBeNull();
      expect(backend.errors.error()).toBeNull();
    });

    it('shows the error of the issue search below the field', async () => {
      const test = setup(backendWith(created, () => problem(403, 'PROJECT_NOT_ALLOWED')));
      test.backend.preferences.save({ projectId: '1234' });

      test.show();

      const error = await screen.findByTestId('create-issue-search-error');
      expect(error.textContent).toBe(
        'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.',
      );
      expect(screen.queryByTestId('create-project-search-error')).toBeNull();
      expect(test.backend.errors.error()).toBeNull();
    });
  });
});
