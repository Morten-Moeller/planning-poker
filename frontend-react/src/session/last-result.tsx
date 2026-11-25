import type { SessionView } from '../api/api';
import { CardValue } from './card-value';
import { externalUrl } from './external-link';
import styles from './last-result.module.css';
import { t } from './messages';
import { useSession } from './use-session';

type HistoryEntry = SessionView['history'][number];

const SYMBOL_SEPARATOR = ' · ';
const SYMBOL_SAVED = '✓ ';
const SYMBOL_OPEN = '↗';
const IID_PREFIX = '#';

export function lastConfirmed(session: SessionView | null): HistoryEntry | null {
  if (session === null || session.phase !== 'LOBBY' || session.me.role === 'SCRUM_MASTER') {
    return null;
  }
  const latest = session.history[0];
  return latest?.finalCard ? latest : null;
}

export function LastResult() {
  const session = useSession();
  const entry = lastConfirmed(session);
  if (session === null || entry === null || entry.finalCard === null) {
    return null;
  }
  const project = session.project ?? null;
  const issueUrl = externalUrl(
    project === null ? null : `${project.webUrl}/-/issues/${entry.issueIid}`,
  );

  return (
    <section className={styles.lastResult} data-testid="last-result">
      <h2 className={styles.title}>{t('lastResult.title')}</h2>
      <div className={styles.content}>
        <div className={styles.final}>
          <span className={styles.finalLabel}>{t('lastResult.finalCard')}</span>
          <CardValue
            card={entry.finalCard}
            className={styles.finalValue}
            testId="last-result-final-card"
          />
        </div>
        <div className={styles.facts}>
          <span className={styles.issue} data-testid="last-result-issue">
            <span className={styles.iid}>
              {IID_PREFIX}
              {entry.issueIid}
            </span>{' '}
            {entry.issueTitle}
          </span>
          <span className={styles.round}>
            <span data-testid="last-result-round">
              {t('lastResult.round', { round: entry.roundNumber })}
            </span>
            <span aria-hidden="true">{SYMBOL_SEPARATOR}</span>
            <span>{t('lastResult.cards')}</span>{' '}
            <span className={styles.cards} data-testid="last-result-cards">
              {entry.votes.map((vote, index) => (
                <span key={vote.participantId}>
                  {index > 0 && <span aria-hidden="true">{SYMBOL_SEPARATOR}</span>}
                  <CardValue card={vote.card} />
                </span>
              ))}
            </span>
          </span>
          <span className={styles.saved}>
            <span aria-hidden="true">{SYMBOL_SAVED}</span>
            <span data-testid="last-result-saved">{t('lastResult.saved')}</span>
          </span>
          {issueUrl !== null && (
            <a
              className={styles.open}
              data-testid="last-result-open"
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('lastResult.open')}{' '}
              <span className="app-symbol" aria-hidden="true">
                {SYMBOL_OPEN}
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
