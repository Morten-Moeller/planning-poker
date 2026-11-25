import { useEffect, useState } from 'react';
import { AppButton } from '../ui/app-button';
import { CardHand } from '../ui/card-hand';
import { ErrorNote } from '../ui/error-note';
import { CreateForm } from './create-form';
import { backendReachable } from './health-api';
import { t } from './messages';
import type { TextKey } from './messages';
import { RecentSessionsList } from './recent-sessions-list';
import styles from './start-page.module.css';

interface HealthResult {
  attempt: number;
  reachable: boolean;
}

type HealthState = 'checking' | 'up' | 'down';

const STATUS_TEXT: Record<HealthState, TextKey> = {
  checking: 'start.backendChecking',
  up: 'start.backendReachable',
  down: 'start.backendUnreachable',
};

const STATUS_SYMBOL: Record<HealthState, string> = { checking: '◌', up: '●', down: '✕' };
const STATUS_CLASS: Record<HealthState, string> = {
  checking: styles.health,
  up: `${styles.health} ${styles.up}`,
  down: `${styles.health} ${styles.down}`,
};
const RETRY_SYMBOL = '↻';

export function StartPage() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<HealthResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    backendReachable(controller.signal).then(
      (reachable) => setResult({ attempt, reachable }),
      () => {
        if (!controller.signal.aborted) {
          setResult({ attempt, reachable: false });
        }
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const current = result?.attempt === attempt ? result : null;
  const state: HealthState = current === null ? 'checking' : current.reachable ? 'up' : 'down';
  const backendDown = result !== null && !result.reachable;

  return (
    <div className={styles.page} data-testid="start-page">
      <div className={styles.intro}>
        <CardHand size="large" />
        <h1 className={styles.title}>{t('start.title')}</h1>
        <p className={styles.lead} data-testid="start-lead">
          {t('start.lead')}
        </p>
      </div>
      <RecentSessionsList />
      <div className={styles.panels}>
        <CreateForm backendDown={backendDown} />
      </div>
      <footer className={styles.footer} data-testid="start-footer">
        <div className={STATUS_CLASS[state]} role="status" data-testid="health">
          <span className={styles.healthIcon} aria-hidden="true">
            {STATUS_SYMBOL[state]}
          </span>
          <span data-testid="health-status">{t(STATUS_TEXT[state])}</span>
        </div>
        {backendDown && (
          <ErrorNote icon={false} className={styles.healthNote} data-testid="health-down">
            <span className={styles.healthNoteText}>{t('start.backendDownHint')}</span>
            <AppButton
              variant="outlined"
              tone="on-error"
              type="button"
              data-testid="health-retry"
              onClick={() => setAttempt((last) => last + 1)}
            >
              <span className="app-symbol" aria-hidden="true">
                {RETRY_SYMBOL}
              </span>
              {t('start.backendRetry')}
            </AppButton>
          </ErrorNote>
        )}
      </footer>
    </div>
  );
}
