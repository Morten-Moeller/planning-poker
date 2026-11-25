import type { ReactNode } from 'react';
import type { SessionView } from '../api/api';
import { CardValue } from './card-value';
import { cardLabel, cardSymbol } from './cards';
import { Confetti } from './confetti';
import { consensusCard } from './consensus';
import { t } from './messages';
import { motifName } from './motif-name';
import { outlierCards } from './outliers';
import { prefersReducedMotion } from './reduced-motion';
import styles from './round-result.module.css';
import { averageText } from './round-stats';
import bar from './round-status.module.css';
import { SeatTable } from './seat-table';

const SEPARATOR = ' · ';
const NAME_SEPARATOR = ', ';
const LIST_SEPARATOR = ',';

export function RoundResult({
  session,
  motif,
  children,
}: {
  session: SessionView;
  motif: number;
  children?: ReactNode;
}) {
  const round = session.round;
  const votes = round?.votes ?? [];
  const stats = round?.stats ?? null;
  const developers = session.participants.filter((participant) => participant.role === 'DEVELOPER');
  const voted = new Set(votes.map((vote) => vote.participantId));
  const notVoted = developers.filter((developer) => !voted.has(developer.id));
  const absent = notVoted
    .filter((developer) => !developer.connected)
    .map((developer) => developer.name);
  const absentText =
    absent.length === 0
      ? null
      : absent.length === 1
        ? t('roundResult.absentOne', { names: absent.join(NAME_SEPARATOR) })
        : t('roundResult.absentMany', { names: absent.join(NAME_SEPARATOR) });
  const consensus = consensusCard(votes);
  const outliers = outlierCards(votes);
  const maxCount = Math.max(1, ...(stats?.distribution ?? []).map((entry) => entry.count));

  return (
    <section className={styles.result} data-testid="round-result">
      <h2 className={styles.title}>{t('roundResult.title')}</h2>
      <div className={bar.bar}>
        {round !== null && (
          <span className={bar.phase}>
            <span data-testid="round-number">
              {t('roundResult.number', { round: round.number })}
            </span>
            {t('roundResult.revealed')}
          </span>
        )}
        <span className={bar.counter} data-testid="result-counter">
          <strong>{t('roundResult.voteCount', { count: votes.length })}</strong>
          {absentText !== null && (
            <>
              {SEPARATOR}
              {absentText}
            </>
          )}
        </span>
        <span className={bar.motif} data-testid="motif-name">
          <span className={bar.swatch} aria-hidden="true" />
          {t('roundResult.motif', { name: motifName(motif) })}
        </span>
      </div>
      {children}
      {round?.confirming === true && (
        <p className={styles.hint} role="status" data-testid="confirming-hint">
          {t('roundResult.confirming')}
        </p>
      )}
      {consensus !== null && (
        <>
          {!prefersReducedMotion() && <Confetti />}
          <div className={styles.consensus}>
            <span className={styles.consensusCard} aria-hidden="true">
              {cardSymbol(consensus)}
            </span>
            <p className={styles.consensusHint} role="status" data-testid="consensus-hint">
              {t('roundResult.consensus', { count: votes.length, card: cardLabel(consensus) })}
            </p>
          </div>
          {notVoted.length > 0 && (
            <p className={styles.note} data-testid="turnout-hint">
              {t('roundResult.turnout', { count: votes.length, total: developers.length })}
            </p>
          )}
        </>
      )}
      {outliers.size > 0 && (
        <div className={styles.outliers} role="note">
          <span className={styles.outliersTitle}>{t('roundResult.outlierTitle')}</span>
          <span data-testid="outlier-hint">{t('roundResult.outlierHint')}</span>
        </div>
      )}
      {votes.length === 0 && (
        <p className={styles.note} data-testid="result-empty">
          {t('roundResult.empty')}
        </p>
      )}
      <SeatTable session={session} />
      {notVoted.length > 0 && (
        <p className={styles.note} data-testid="not-voted">
          <span>{t('roundResult.notVoted')}</span>{' '}
          {notVoted.map((developer, index) => (
            <span key={developer.id}>
              <span data-testid="not-voted-name">
                {developer.connected
                  ? developer.name
                  : t('roundResult.notConnected', { name: developer.name })}
              </span>
              {index < notVoted.length - 1 && `${LIST_SEPARATOR} `}
            </span>
          ))}
        </p>
      )}
      {stats !== null && (
        <div className={styles.stats}>
          <div className={styles.panel} data-testid="result-distribution">
            <h3 className={styles.label}>{t('roundResult.distribution')}</h3>
            <ul className={styles.distribution}>
              {stats.distribution.map((entry) => (
                <li key={entry.card} className={styles.row} data-testid="result-count">
                  <CardValue card={entry.card} className={styles.card} testId="result-count-card" />
                  <span className={styles.barTrack} aria-hidden="true">
                    <span
                      className={styles.barValue}
                      style={{ width: `${(entry.count / maxCount) * 100}%` }}
                    />
                  </span>
                  <span className={styles.count} data-testid="result-count-votes">
                    {t('roundResult.count', { count: entry.count })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${styles.panel} ${styles.facts}`} data-testid="result-facts">
            <h3 className={styles.label}>{t('roundResult.orientation')}</h3>
            <dl className={styles.factList}>
              <div className={styles.fact}>
                <dt className={styles.factName}>
                  {t('roundResult.average')}
                  <span className={styles.title}>{t('roundResult.orientationNote')}</span>
                </dt>
                <dd className={styles.factValue} data-testid="result-average">
                  {averageText(stats.average ?? null)}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factName}>
                  {t('roundResult.mostFrequent')}
                  <span className={styles.title}>{t('roundResult.orientationNote')}</span>
                </dt>
                <dd className={styles.factValue} data-testid="result-most-frequent">
                  {stats.mostFrequent.map((card, index) => (
                    <span key={card}>
                      <CardValue card={card} />
                      {index < stats.mostFrequent.length - 1 && <span>{NAME_SEPARATOR}</span>}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className={styles.noProposal}>{t('roundResult.noProposal')}</p>
          </div>
        </div>
      )}
    </section>
  );
}
