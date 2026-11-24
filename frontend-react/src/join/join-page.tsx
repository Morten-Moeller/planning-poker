import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ApiError } from '../api/api-error';
import type { ErrorCode } from '../api/api-error';
import { useBackend } from '../api/backend';
import { formErrorMessage } from '../api/error-messages';
import { participantNameError } from '../api/participant-name';
import type { ParticipantNameError } from '../api/participant-name';
import type { ParticipantRole } from '../api/recent-sessions';
import { AppButton } from '../ui/app-button';
import { CardHand } from '../ui/card-hand';
import { ErrorNote } from '../ui/error-note';
import { TextField } from '../ui/text-field';
import { t } from './messages';
import type { MessageKey } from './messages';
import styles from './join-page.module.css';

const JOIN_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'SESSION_NOT_FOUND',
  'INVITE_INVALID',
  'NAME_TAKEN',
  'LIMIT_REACHED',
  'VALIDATION_ERROR',
]);

const NAME_ERROR_TEXT: Record<ParticipantNameError, MessageKey> = {
  required: 'join.nameRequired',
  tooLong: 'join.nameTooLong',
};

const SYMBOL_WARNING = '⚠';
const VIEWER_PARAMETER = 'viewer';

type JoinFailure = 'none' | 'sessionNotFound' | 'inviteInvalid';

interface JoinFormProps {
  sessionId: string;
  invite: string;
  viewer: boolean;
}

function JoinForm({ sessionId, invite, viewer }: JoinFormProps) {
  const { api, errors, preferences, tokens } = useBackend();
  const navigate = useNavigate();
  const [name, setName] = useState(() => preferences.read().name);
  const [touched, setTouched] = useState(false);
  const [nameTaken, setNameTaken] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState<JoinFailure>('none');

  const nameError = participantNameError(name);
  const shownNameError = touched && nameError !== null ? t(NAME_ERROR_TEXT[nameError]) : null;

  function showFailure(error: unknown) {
    setJoining(false);
    const message = formErrorMessage(error, JOIN_FORM_ERRORS);
    if (message === null) {
      return;
    }
    errors.clear();
    const code = error instanceof ApiError ? error.errorCode : null;
    if (code === 'SESSION_NOT_FOUND') {
      setFailure('sessionNotFound');
    } else if (code === 'INVITE_INVALID') {
      setFailure('inviteInvalid');
    } else if (code === 'NAME_TAKEN') {
      setNameTaken(message);
    } else {
      setJoinError(message);
    }
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError(null);
    setTouched(true);
    if (joining || nameError !== null) {
      return;
    }
    const trimmedName = name.trim();
    const role: ParticipantRole = viewer ? 'VIEWER' : 'DEVELOPER';
    setJoining(true);
    api.joinSession(sessionId, { name: trimmedName, invite }).then(({ participantId, token }) => {
      tokens.store(sessionId, { participantId, token }, { role, name: trimmedName });
      preferences.save({ name: trimmedName });
      void navigate(`/session/${encodeURIComponent(sessionId)}`);
    }, showFailure);
  }

  function changeName(next: string) {
    setName(next);
    setNameTaken(null);
  }

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('join.nameTitle')}</h1>
        {failure === 'none' && (
          <span
            className={styles.roleHint}
            data-testid={viewer ? 'join-viewer-hint' : 'join-role-hint'}
          >
            {viewer ? t('join.viewerHint') : t('join.roleHint')}
          </span>
        )}
      </div>
      {failure === 'inviteInvalid' && (
        <ErrorNote>
          <span data-testid="join-invite-invalid">{t('join.inviteInvalid')}</span>
        </ErrorNote>
      )}
      {failure === 'sessionNotFound' && (
        <ErrorNote icon={false} className={styles.notFound} data-testid="join-not-found">
          <span className={styles.notFoundTitle}>
            <span className={styles.notFoundIcon} aria-hidden="true">
              {SYMBOL_WARNING}
            </span>
            {t('join.notFoundTitle')}
          </span>
          <span>
            {t('join.notFoundText')}
            <Link className={styles.notFoundLink} to="/" data-testid="join-not-found-home">
              {t('join.notFoundHome')}
            </Link>
          </span>
        </ErrorNote>
      )}
      {failure === 'none' && (
        <form className={styles.form} onSubmit={join} noValidate data-testid="join-form">
          {joinError !== null && (
            <ErrorNote>
              <span data-testid="join-error">{joinError}</span>
            </ErrorNote>
          )}
          <TextField
            label={t('join.name')}
            hint={t('join.nameHint')}
            error={nameTaken ?? shownNameError ?? undefined}
            value={name}
            onChange={changeName}
            onBlur={() => setTouched(true)}
            autoComplete="name"
            data-testid="join-name"
            errorTestId={nameTaken !== null ? 'join-error' : 'join-name-error'}
          />
          <AppButton
            variant="filled"
            type="submit"
            className={styles.submit}
            disabled={joining}
            data-testid="join-submit"
          >
            {t('join.join')}
          </AppButton>
        </form>
      )}
    </>
  );
}

export function JoinPage() {
  const { id = '' } = useParams();
  const [query] = useSearchParams();
  const sessionId = id.toUpperCase();
  const invite = (query.get('invite') ?? '').trim();
  const viewer = query.get('as') === VIEWER_PARAMETER;

  return (
    <div className={styles.page}>
      <section className={styles.join}>
        <div className={styles.hand}>
          <CardHand size="large" />
        </div>
        {invite === '' ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.title}>{t('join.nameTitle')}</h1>
            </div>
            <ErrorNote>
              <span data-testid="join-invite-missing">{t('join.inviteMissing')}</span>
            </ErrorNote>
          </>
        ) : (
          <JoinForm
            key={`${sessionId} ${invite} ${String(viewer)}`}
            sessionId={sessionId}
            invite={invite}
            viewer={viewer}
          />
        )}
      </section>
    </div>
  );
}
