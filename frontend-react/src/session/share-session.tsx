import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { SessionView } from '../api/api';
import { AppButton } from '../ui/app-button';
import { t } from './messages';
import type { MessageKey } from './messages';
import styles from './share-session.module.css';

export type ShareTarget = 'developer' | 'viewer';
export type SessionInvites = NonNullable<SessionView['invites']>;

const COPIED_VISIBLE_MS = 3000;
const TARGETS: readonly ShareTarget[] = ['developer', 'viewer'];
const LABEL: Record<ShareTarget, MessageKey> = {
  developer: 'share.developerLabel',
  viewer: 'share.viewerLabel',
};
const COPY_LABEL: Record<ShareTarget, MessageKey> = {
  developer: 'share.copyDeveloperLink',
  viewer: 'share.copyViewerLink',
};
const SYMBOL_COPY = '⧉';
const SYMBOL_DONE = '✓ ';
const SYMBOL_FAILED = '⚠ ';
const SYMBOL_NEW = '＋ ';

function inviteLinks(sessionId: string, invites: SessionInvites): Record<ShareTarget, string> {
  const base = `${window.location.origin}/session/${encodeURIComponent(sessionId)}/join`;
  return {
    developer: `${base}?invite=${encodeURIComponent(invites.developer)}`,
    viewer: `${base}?invite=${encodeURIComponent(invites.viewer)}&as=viewer`,
  };
}

function browserClipboard(): Clipboard | null {
  return (window.navigator.clipboard as Clipboard | undefined) ?? null;
}

export function ShareSession({
  sessionId,
  invites,
}: {
  sessionId: string;
  invites: SessionInvites;
}) {
  const [copied, setCopied] = useState<ShareTarget | null>(null);
  const [failed, setFailed] = useState<ShareTarget | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const links = inviteLinks(sessionId, invites);
  const canCopy = browserClipboard() !== null;

  const stopCopiedTimer = () => {
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const copy = (target: ShareTarget) => {
    browserClipboard()
      ?.writeText(links[target])
      .then(
        () => {
          setFailed(null);
          setCopied(target);
          stopCopiedTimer();
          copiedTimer.current = window.setTimeout(() => {
            copiedTimer.current = null;
            setCopied(null);
          }, COPIED_VISIBLE_MS);
        },
        () => {
          stopCopiedTimer();
          setCopied(null);
          setFailed(target);
        },
      );
  };

  return (
    <section className={styles.share} data-testid="session-share">
      <h2 className={styles.title}>{t('share.title')}</h2>
      {TARGETS.map((target) => (
        <div key={target} className={styles.invite}>
          <span className={styles.label}>{t(LABEL[target])}</span>
          <div className={styles.field}>
            <code className={styles.link} data-testid={`share-link-${target}`}>
              {links[target]}
            </code>
            {canCopy && (
              <AppButton
                variant="text"
                type="button"
                data-testid={`copy-link-${target}`}
                aria-label={t(COPY_LABEL[target])}
                onClick={() => copy(target)}
              >
                <span>
                  <span className="app-symbol" aria-hidden="true">
                    {SYMBOL_COPY}
                  </span>{' '}
                  {t('share.copy')}
                </span>
              </AppButton>
            )}
          </div>
          {copied === target && (
            <span className={`${styles.note} ${styles.done}`}>
              <span aria-hidden="true">{SYMBOL_DONE}</span>
              <span role="status" data-testid={`copy-link-${target}-done`}>
                {t('share.copied')}
              </span>
            </span>
          )}
          {failed === target && (
            <span className={`${styles.note} ${styles.failed}`}>
              <span aria-hidden="true">{SYMBOL_FAILED}</span>
              <span role="status" data-testid={`copy-link-${target}-failed`}>
                {t('share.copyFailed')}
              </span>
            </span>
          )}
        </div>
      ))}
      <AppButton
        variant="outlined"
        className={styles.newSession}
        data-testid="new-session"
        render={<Link to="/" />}
      >
        <span>
          <span aria-hidden="true">{SYMBOL_NEW}</span>
          {t('share.newSession')}
        </span>
      </AppButton>
    </section>
  );
}
