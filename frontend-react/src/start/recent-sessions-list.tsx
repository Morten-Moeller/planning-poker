import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { SessionView } from '../api/api';
import { ApiError } from '../api/api-error';
import { useBackend } from '../api/backend';
import type { ParticipantRole, RecentSession } from '../api/recent-sessions';
import { AppButton } from '../ui/app-button';
import { t } from './messages';
import type { TextKey } from './messages';
import styles from './recent-sessions-list.module.css';

interface RecentSessionRow {
  entry: RecentSession;
  view: SessionView | null;
}

interface CheckedSessions {
  rows: readonly RecentSessionRow[];
  checkedAt: number;
}

const GONE_SESSION_ERRORS: ReadonlySet<string> = new Set(['SESSION_NOT_FOUND', 'UNAUTHORIZED']);
const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;
const SEPARATOR = '·';
const ROLE_TEXT: Record<ParticipantRole, TextKey> = {
  SCRUM_MASTER: 'start.recent.role.SCRUM_MASTER',
  DEVELOPER: 'start.recent.role.DEVELOPER',
  VIEWER: 'start.recent.role.VIEWER',
};
const NONE: CheckedSessions = { rows: [], checkedAt: 0 };

function lastUsedText(lastUsedAt: string, now: number): string {
  const minutes = Math.max(1, Math.floor((now - Date.parse(lastUsedAt)) / MINUTE_MS));
  if (minutes < HOUR_MINUTES) {
    return t('start.recent.lastUsedMinutes', { count: minutes });
  }
  const hours = Math.floor(minutes / HOUR_MINUTES);
  return hours < DAY_HOURS
    ? t('start.recent.lastUsedHours', { count: hours })
    : t('start.recent.lastUsedDays', { count: Math.floor(hours / DAY_HOURS) });
}

function Separator() {
  return <span aria-hidden="true">{SEPARATOR}</span>;
}

export function RecentSessionsList() {
  const { api, errors, recent, tokens } = useBackend();
  const [checked, setChecked] = useState(NONE);

  useEffect(() => {
    const enabled = recent.enabled();
    if (enabled === false) {
      recent.clear();
      return;
    }
    const entries = enabled === true ? recent.list() : [];
    if (entries.length === 0) {
      return;
    }
    let current = true;
    const check = (entry: RecentSession): Promise<RecentSessionRow | null> =>
      api.getSession(entry.sessionId).then(
        (view) => ({ entry, view }),
        (error: unknown) => {
          errors.clear();
          if (error instanceof ApiError && GONE_SESSION_ERRORS.has(error.errorCode)) {
            tokens.remove(entry.sessionId);
            return null;
          }
          return { entry, view: null };
        },
      );
    void Promise.all(entries.map(check)).then((rows) => {
      if (current) {
        setChecked({ rows: rows.filter((row) => row !== null), checkedAt: Date.now() });
      }
    });
    return () => {
      current = false;
    };
  }, [api, errors, recent, tokens]);

  const remove = (sessionId: string) => {
    recent.remove(sessionId);
    setChecked((last) => ({
      ...last,
      rows: last.rows.filter((row) => row.entry.sessionId !== sessionId),
    }));
  };

  if (checked.rows.length === 0) {
    return null;
  }
  return (
    <section className={styles.recent} data-testid="recent-sessions">
      <h2 className={styles.title}>{t('start.recent.title')}</h2>
      <ul className={styles.list}>
        {checked.rows.map(({ entry, view }) => (
          <li key={entry.sessionId} className={styles.row} data-testid="recent-session">
            <Link className={styles.open} to={`/session/${encodeURIComponent(entry.sessionId)}`}>
              {view !== null && (
                <span className={styles.main}>
                  <span className={styles.project} data-testid="recent-session-project">
                    {view.project?.name ?? view.gitlabProjectId}
                  </span>
                  <span className={styles.issue} data-testid="recent-session-issue">
                    {view.activeIssue === null ? (
                      t('start.recent.noIssue')
                    ) : (
                      <>
                        <span className={styles.iid}>#{view.activeIssue.iid}</span>{' '}
                        {view.activeIssue.title}
                      </>
                    )}
                  </span>
                </span>
              )}
              <span className={styles.meta}>
                <span data-testid="recent-session-role">
                  {t(ROLE_TEXT[view?.me.role ?? entry.role])}
                </span>
                <Separator />
                <span data-testid="recent-session-name">{entry.name}</span>
                <Separator />
                <span className={styles.id} data-testid="recent-session-id">
                  {entry.sessionId}
                </span>
                <Separator />
                <span data-testid="recent-session-last-used">
                  {lastUsedText(entry.lastUsedAt, checked.checkedAt)}
                </span>
              </span>
            </Link>
            <AppButton
              variant="text"
              type="button"
              className={styles.remove}
              data-testid="recent-session-remove"
              onClick={() => remove(entry.sessionId)}
            >
              {t('start.recent.remove')}
            </AppButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
