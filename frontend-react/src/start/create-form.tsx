import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import type { CreateSessionResponse } from '../api/api';
import { ApiError } from '../api/api-error';
import type { ErrorCode } from '../api/api-error';
import { useBackend } from '../api/backend';
import { errorMessage, formErrorMessage } from '../api/error-messages';
import { participantNameError } from '../api/participant-name';
import type { ParticipantNameError } from '../api/participant-name';
import { TIMER_OFF } from '../api/preferences-store';
import { AppButton } from '../ui/app-button';
import { ErrorNote } from '../ui/error-note';
import { TextField } from '../ui/text-field';
import styles from './create-form.module.css';
import { t } from './messages';
import type { TextKey } from './messages';
import { PickerField } from './picker-field';
import type { PickerOption } from './picker-field';
import { createIssueSearch, createProjectSearch } from './project-search';
import type { IssueSummary, ProjectSummary, SearchTimers } from './project-search';

type FieldName = 'name' | 'project' | 'issue';

const NOT_BLANK = /\S/;
const ISSUE_NUMBER = /^\s*\d*\s*$/;
const PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND';
const SEPARATOR = '·';
const CREATE_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'ISSUE_NOT_FOUND',
  'PROJECT_NOT_ALLOWED',
  'LIMIT_REACHED',
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
  'VALIDATION_ERROR',
]);
const NAME_ERROR_TEXT: Record<ParticipantNameError, TextKey> = {
  required: 'start.create.nameRequired',
  tooLong: 'start.create.nameTooLong',
};
const UNTOUCHED: Record<FieldName, boolean> = { name: false, project: false, issue: false };
const ALL_TOUCHED: Record<FieldName, boolean> = { name: true, project: true, issue: true };

function issueIsValid(issue: string): boolean {
  if (!ISSUE_NUMBER.test(issue)) {
    return false;
  }
  return issue.trim() === '' || Number(issue) >= 1;
}

function browserTimers(): SearchTimers {
  return {
    setTimeout: (handler, delayMs) => window.setTimeout(handler, delayMs),
    clearTimeout: (timer) => window.clearTimeout(timer as number),
  };
}

function projectOption(project: ProjectSummary): PickerOption {
  return {
    value: String(project.id),
    content: (
      <>
        <span className={styles.pickTitle}>{project.name}</span>
        <span className={styles.pickDetail}>
          {project.pathWithNamespace} {SEPARATOR} {project.id}
        </span>
      </>
    ),
  };
}

function issueOption(issue: IssueSummary): PickerOption {
  return {
    value: String(issue.iid),
    content: (
      <>
        <span className={styles.pickIid}>#{issue.iid}</span> {issue.title}
      </>
    ),
  };
}

export function CreateForm({ backendDown }: { backendDown: boolean }) {
  const { api, errors, preferences, tokens } = useBackend();
  const navigate = useNavigate();
  const [saved] = useState(() => preferences.read());
  const [name, setName] = useState(saved.name);
  const [project, setProject] = useState(saved.projectId);
  const [issue, setIssue] = useState('');
  const [touched, setTouched] = useState(UNTOUCHED);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [projectSearch] = useState(() =>
    createProjectSearch(api, errors, browserTimers(), saved.projectId),
  );
  const [issueSearch] = useState(() => createIssueSearch(api, errors, browserTimers()));
  const projects = useSyncExternalStore(projectSearch.subscribe, projectSearch.result);
  const issues = useSyncExternalStore(issueSearch.subscribe, issueSearch.result);

  useEffect(() => {
    issueSearch.input(project, issue);
  }, [issueSearch, project, issue]);

  useEffect(
    () => () => {
      projectSearch.stop();
      issueSearch.stop();
    },
    [projectSearch, issueSearch],
  );

  const nameProblem = participantNameError(name);
  const projectMissing = !NOT_BLANK.test(project);
  const issueInvalid = !issueIsValid(issue);
  const nameError =
    touched.name && nameProblem !== null ? t(NAME_ERROR_TEXT[nameProblem]) : undefined;
  const projectError = projectNotFound
    ? errorMessage(PROJECT_NOT_FOUND)
    : touched.project && projectMissing
      ? t('start.create.projectRequired')
      : undefined;
  const issueError = touched.issue && issueInvalid ? t('start.create.issueInvalid') : undefined;

  const touch = (field: FieldName) =>
    setTouched((last) => (last[field] ? last : { ...last, [field]: true }));

  const changeProject = (value: string) => {
    setProject(value);
    setProjectNotFound(false);
    projectSearch.text(value);
  };

  const showFailure = (error: unknown) => {
    setCreating(false);
    if (error instanceof ApiError && error.errorCode === PROJECT_NOT_FOUND) {
      errors.clear();
      setProjectNotFound(true);
      return;
    }
    const message = formErrorMessage(error, CREATE_FORM_ERRORS);
    if (message !== null) {
      errors.clear();
      setCreateError(message);
    }
  };

  const createSession = async () => {
    setCreateError(null);
    if (backendDown || creating) {
      return;
    }
    if (nameProblem !== null || projectMissing || issueInvalid) {
      setTouched(ALL_TOUCHED);
      return;
    }
    const participantName = name.trim();
    const projectId = project.trim();
    const issueText = issue.trim();
    setCreating(true);
    let created: CreateSessionResponse;
    try {
      created = await api.createSession({
        name: participantName,
        gitlabProjectId: projectId,
        ...(issueText === '' ? {} : { issueIid: Number(issueText) }),
      });
    } catch (error) {
      showFailure(error);
      return;
    }
    const { sessionId, participantId, token } = created;
    tokens.store(
      sessionId,
      { participantId, token },
      { role: 'SCRUM_MASTER', name: participantName },
    );
    preferences.save({ name: participantName, projectId });
    const seconds = preferences.read().timerSeconds;
    if (seconds !== TIMER_OFF) {
      await api.setTimer(sessionId, { seconds }).catch(() => undefined);
    }
    await navigate(`/session/${encodeURIComponent(sessionId)}`);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createSession();
  };

  return (
    <form className={styles.panel} noValidate onSubmit={submit} data-testid="create-form">
      <div className={styles.head}>
        <h2 className={styles.title}>{t('start.create.title')}</h2>
        <span className={styles.subtitle}>{t('start.create.subtitle')}</span>
      </div>
      {createError !== null && (
        <ErrorNote>
          <span data-testid="create-error">{createError}</span>
        </ErrorNote>
      )}
      <TextField
        label={t('start.create.name')}
        value={name}
        onChange={setName}
        onBlur={() => touch('name')}
        error={nameError}
        autoComplete="name"
        data-testid="create-name"
        errorTestId="create-name-error"
      />
      <PickerField
        label={t('start.create.project')}
        hint={t('start.create.projectHint')}
        error={projectError}
        value={project}
        onChange={changeProject}
        onFocus={() => projectSearch.focus(project)}
        onBlur={() => touch('project')}
        options={projects.items.map(projectOption)}
        emptyText={
          projects.searched && projects.error === null ? t('start.create.projectNoResults') : null
        }
        data-testid="create-project"
        errorTestId="create-project-error"
        optionTestId="create-project-option"
        emptyTestId="create-project-empty"
      />
      {projects.error !== null && (
        <ErrorNote>
          <span data-testid="create-project-search-error">{projects.error}</span>
        </ErrorNote>
      )}
      <PickerField
        label={t('start.create.issue')}
        hint={t('start.create.issueHint')}
        error={issueError}
        value={issue}
        onChange={setIssue}
        onBlur={() => touch('issue')}
        options={issues.items.map(issueOption)}
        emptyText={
          issues.searched && issues.error === null ? t('start.create.issueNoResults') : null
        }
        data-testid="create-issue"
        errorTestId="create-issue-error"
        optionTestId="create-issue-option"
        emptyTestId="create-issue-empty"
      />
      {issues.error !== null && (
        <ErrorNote>
          <span data-testid="create-issue-search-error">{issues.error}</span>
        </ErrorNote>
      )}
      <AppButton
        variant="filled"
        type="submit"
        className={styles.submit}
        disabled={creating || backendDown}
        data-testid="create-submit"
      >
        {backendDown ? t('start.create.submitWithoutBackend') : t('start.create.submit')}
      </AppButton>
    </form>
  );
}
