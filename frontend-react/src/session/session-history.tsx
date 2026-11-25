import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible';
import type { SessionView } from '../api/api';
import { CardValue } from './card-value';
import { t } from './messages';
import { averageText } from './round-stats';
import styles from './session-history.module.css';

const IID_PREFIX = '#';
const SEPARATOR = ' · ';
const LIST_SEPARATOR = ', ';

export function SessionHistory({ session }: { session: SessionView }) {
  const history = session.history;

  return (
    <Collapsible className={styles.history} data-testid="history-panel">
      <CollapsibleTrigger className={styles.toggle} data-testid="history-toggle">
        <h2 className={styles.title}>{t('history.title')}</h2>
        <span className={styles.count} data-testid="history-count">
          {t('history.count', { count: history.length })}
        </span>
        <span className={styles.arrow} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsiblePanel className={styles.panel} keepMounted>
        <ol className={styles.entries}>
          {history.map((entry) => (
            <li
              key={`${entry.revealedAt}${entry.issueIid}${entry.roundNumber}`}
              className={styles.entry}
              data-testid="history-entry"
            >
              <h3 className={styles.issue}>
                <span data-testid="history-issue">
                  <span className={styles.iid}>
                    {IID_PREFIX}
                    {entry.issueIid}
                  </span>{' '}
                  {entry.issueTitle}
                </span>
              </h3>
              <p className={styles.round}>
                <span data-testid="history-round">
                  {t('history.round', { round: entry.roundNumber })}
                </span>
                <span aria-hidden="true">{SEPARATOR}</span>
                <span>{t('history.cards')}</span>{' '}
                <span className={styles.votes} role="list">
                  {entry.votes.map((vote, index) => (
                    <span key={vote.participantId}>
                      {index > 0 && <span aria-hidden="true">{SEPARATOR}</span>}
                      <span className={styles.vote} role="listitem" data-testid="history-vote">
                        <span className={styles.name}>{vote.name}</span>
                        <CardValue card={vote.card} />
                      </span>
                    </span>
                  ))}
                </span>
              </p>
              <dl className={styles.stats}>
                <dt>{t('history.average')}</dt>
                <dd className={styles.stat} data-testid="history-average">
                  {averageText(entry.stats.average ?? null)}
                </dd>
                <dt>{t('history.mostFrequent')}</dt>
                <dd className={styles.stat} data-testid="history-most-frequent">
                  {entry.stats.mostFrequent.map((card, index) => (
                    <span key={card}>
                      {index > 0 && <span>{LIST_SEPARATOR}</span>}
                      <CardValue card={card} />
                    </span>
                  ))}
                </dd>
              </dl>
              {entry.finalCard ? (
                <span className={`${styles.final} ${styles.confirmed}`}>
                  <span>{t('history.finalCard')}</span>{' '}
                  <CardValue card={entry.finalCard} testId="history-final-card" />
                </span>
              ) : (
                <span className={styles.final} data-testid="history-no-final-card">
                  {t('history.noFinalCard')}
                </span>
              )}
            </li>
          ))}
        </ol>
      </CollapsiblePanel>
    </Collapsible>
  );
}
