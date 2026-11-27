import { Toggle } from '@ui-sdk/react/toggle';
import { useSyncExternalStore } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useBackend } from '../api/backend';
import { motifOf } from '../api/card-motif';
import type { ParticipantRole } from '../api/recent-sessions';
import '../styles/motifs.css';
import { t } from './messages';
import type { MessageKey } from './messages';
import styles from './app-shell.module.css';
import { ErrorBanner } from './error-banner';
import type { ThemeStore } from './theme-store';

const SYMBOL_DARK = '☀️';
const SYMBOL_LIGHT = '🌙';
const NAME_ROLE_SEPARATOR = ' · ';
const JOIN_PATH = /^\/session\/([^/]+)\/join\/?$/;
const SESSION_ID = /^[A-HJKMNP-Z2-9]{8}$/;

const ROLE_TEXT: Record<ParticipantRole, MessageKey> = {
  SCRUM_MASTER: 'shell.role.SCRUM_MASTER',
  DEVELOPER: 'shell.role.DEVELOPER',
  VIEWER: 'shell.role.VIEWER',
};

function joinSessionId(pathname: string): string | null {
  const id = JOIN_PATH.exec(pathname)?.[1]?.toUpperCase();
  return id !== undefined && SESSION_ID.test(id) ? id : null;
}

export function AppShell({ theme }: { theme: ThemeStore }) {
  const { sessions, demo } = useBackend();
  const dark = useSyncExternalStore(theme.subscribe, theme.dark);
  const session = useSyncExternalStore(sessions.subscribe, sessions.session);
  const demoMode = useSyncExternalStore(demo.subscribe, demo.active);
  const { pathname } = useLocation();

  const sessionId = session?.sessionId ?? joinSessionId(pathname);
  const myName =
    session?.participants.find((participant) => participant.id === session.me.participantId)
      ?.name ?? null;

  return (
    <div className={styles.shell}>
      <header className={styles.toolbar} data-testid="toolbar">
        {session !== null && (
          <span
            className={`${styles.motif} ${styles.filled} motif-${motifOf(session)}`}
            data-testid="toolbar-motif"
            data-filled="true"
            aria-hidden="true"
          />
        )}
        {session === null && sessionId !== null && (
          <span className={styles.motif} data-testid="toolbar-motif" aria-hidden="true" />
        )}
        <Link className={styles.title} to="/" data-testid="toolbar-home">
          {t('shell.title')}
        </Link>
        {sessionId !== null && (
          <>
            <span className={styles.sessionId} data-testid="toolbar-session-id">
              {sessionId}
            </span>
            <span className={styles.spacer} />
          </>
        )}
        {session !== null && myName !== null && (
          <span className={styles.me} data-testid="toolbar-me">
            {myName}
            {NAME_ROLE_SEPARATOR}
            {t(ROLE_TEXT[session.me.role])}
          </span>
        )}
        <Toggle
          className={styles.themeToggle}
          data-testid="theme-toggle"
          aria-label={dark ? t('shell.theme.light') : t('shell.theme.dark')}
          pressed={dark}
          onPressedChange={() => theme.toggle()}
        >
          <span className="app-symbol" aria-hidden="true">
            {dark ? SYMBOL_DARK : SYMBOL_LIGHT}
          </span>
        </Toggle>
      </header>
      {demoMode && (
        <p className={styles.demoHint} role="status" data-testid="demo-hint">
          {t('shell.demoHint')}
        </p>
      )}
      <ErrorBanner />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
