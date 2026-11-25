import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@ui-sdk/react/dialog';
import { Progress, ProgressTrack } from '@ui-sdk/react/progress';
import { Radio, RadioGroup } from '@ui-sdk/react/radio';
import { useState } from 'react';
import type { SessionView } from '../api/api';
import type { ErrorCode } from '../api/api-error';
import { useBackend } from '../api/backend';
import { formErrorMessage } from '../api/error-messages';
import { AppButton } from '../ui/app-button';
import { CARDS, cardLabel, cardSymbol } from './cards';
import type { Card } from './cards';
import styles from './confirm-result-dialog.module.css';
import type { ConfirmSuccessData } from './confirm-success';
import { t } from './messages';

interface CardOption {
  card: Card;
  votes: number;
  mostFrequent: boolean;
}

type RoundStats = NonNullable<NonNullable<SessionView['round']>['stats']>;

const CONFIRM_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
]);
const IID_PREFIX = '#';
const SENTENCE_END = '.';
const SYMBOL_CHECK = '✓';
const SYMBOL_TIMES = '×';
const SYMBOL_INFO = 'ⓘ';
const SYMBOL_ERROR = '⚠';
const VOTES_ID = 'confirm-votes-';

function cardOptions(stats: RoundStats | null, consensus: Card | null): CardOption[] {
  const counts = new Map((stats?.distribution ?? []).map((entry) => [entry.card, entry.count]));
  const mostFrequent = new Set(consensus === null ? (stats?.mostFrequent ?? []) : []);
  return CARDS.map((card) => ({
    card,
    votes: counts.get(card) ?? 0,
    mostFrequent: mostFrequent.has(card),
  }));
}

function isCard(value: unknown): value is Card {
  return CARDS.some((card) => card === value);
}

export function ConfirmResultDialog({
  session,
  suggestedCard,
  onClose,
  onConfirmed,
}: {
  session: SessionView;
  suggestedCard: Card | null;
  onClose: () => void;
  onConfirmed: (data: ConfirmSuccessData) => void;
}) {
  const { api, errors } = useBackend();
  const issue = session.activeIssue;
  const writeWeight = session.writeWeight === true;
  const options = cardOptions(session.round?.stats ?? null, suggestedCard);
  const [selected, setSelected] = useState<Card | null>(suggestedCard);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showMostFrequent = options.some((option) => option.mostFrequent);

  const submit = () => {
    if (selected === null || sending) {
      return;
    }
    const confirmed: ConfirmSuccessData = {
      card: selected,
      issueIid: issue?.iid ?? null,
      webUrl: issue?.webUrl ?? null,
    };
    setSending(true);
    setError(null);
    api.confirmRound(session.sessionId, { card: confirmed.card }).then(
      () => {
        onConfirmed(confirmed);
        onClose();
      },
      (failure: unknown) => {
        setSending(false);
        const message = formErrorMessage(failure, CONFIRM_FORM_ERRORS);
        if (message !== null) {
          errors.clear();
          setError(message);
        }
      },
    );
  };

  return (
    <Dialog
      open
      dismissible={!sending}
      onOpenChange={(next) => {
        if (!next && !sending) {
          onClose();
        }
      }}
    >
      <DialogBackdrop className={styles.backdrop} />
      <DialogContent className={styles.dialog} data-testid="confirm-dialog">
        <DialogTitle className={styles.title}>{t('confirmResult.title')}</DialogTitle>
        <div className={styles.content}>
          <DialogDescription className={styles.lead} data-testid="confirm-lead">
            {issue !== null && (
              <>
                {t('confirmResult.finalValueFor')}{' '}
                <strong data-testid="confirm-issue">
                  {IID_PREFIX}
                  {issue.iid} {issue.title}
                </strong>
                {SENTENCE_END}{' '}
              </>
            )}
            {suggestedCard === null
              ? t('confirmResult.noConsensus')
              : t('confirmResult.consensus', { card: cardLabel(suggestedCard) })}
          </DialogDescription>
          <RadioGroup
            className={styles.cards}
            aria-label={t('confirmResult.cardsLabel')}
            value={selected}
            disabled={sending}
            onValueChange={(next) => {
              if (isCard(next)) {
                setSelected(next);
              }
            }}
          >
            {options.map((option) => {
              const chosen = option.card === selected;
              return (
                <label
                  key={option.card}
                  className={[
                    styles.option,
                    chosen && styles.selected,
                    option.mostFrequent && !chosen && styles.mostFrequent,
                    sending && styles.disabled,
                  ]
                    .filter((name) => typeof name === 'string')
                    .join(' ')}
                  data-testid="confirm-card"
                >
                  <Radio
                    className={styles.radio}
                    value={option.card}
                    aria-label={cardLabel(option.card)}
                    aria-describedby={option.votes > 0 ? `${VOTES_ID}${option.card}` : undefined}
                  />
                  <span className={styles.value} aria-hidden="true">
                    {chosen && `${SYMBOL_CHECK} `}
                    {cardSymbol(option.card)}
                  </span>
                  <span className={styles.votes} data-testid="confirm-card-votes">
                    {option.votes > 0 && (
                      <>
                        <span aria-hidden="true">
                          {option.votes}
                          {SYMBOL_TIMES}
                        </span>
                        <span className={styles.hiddenText} id={`${VOTES_ID}${option.card}`}>
                          {option.mostFrequent
                            ? t('confirmResult.votesMostFrequent', { count: option.votes })
                            : t('confirmResult.votes', { count: option.votes })}
                        </span>
                      </>
                    )}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
          {showMostFrequent && (
            <p className={styles.legend} data-testid="confirm-legend">
              <span className={styles.swatch} aria-hidden="true" />
              <span>{t('confirmResult.legend')}</span>
            </p>
          )}
          <p className={styles.note} data-testid="confirm-note">
            <span className={styles.info} aria-hidden="true">
              {SYMBOL_INFO}
            </span>
            <span>
              {t('confirmResult.comment', { iid: issue?.iid ?? '' })}{' '}
              {writeWeight ? t('confirmResult.weightSet') : t('confirmResult.weightKept')}
            </span>
          </p>
          {sending && (
            <div className={styles.writing} role="status" data-testid="confirm-writing">
              <Progress className={styles.progress} aria-label={t('confirmResult.writing')}>
                <ProgressTrack className={styles.progressTrack}>
                  <div className={styles.progressValue} />
                </ProgressTrack>
              </Progress>
              <span>{t('confirmResult.writing')}</span>
            </div>
          )}
          {error !== null && (
            <div className={styles.error} role="alert" data-testid="confirm-error">
              <span aria-hidden="true">{SYMBOL_ERROR}</span>
              <span>
                <strong data-testid="confirm-error-message">{error}</strong>{' '}
                {t('confirmResult.errorHint')}
              </span>
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <AppButton
            variant="text"
            data-testid="confirm-cancel"
            disabled={sending}
            onClick={onClose}
          >
            {t('confirmResult.cancel')}
          </AppButton>
          <AppButton
            variant="filled"
            data-testid="confirm-submit"
            disabled={selected === null || sending}
            onClick={submit}
          >
            {sending
              ? t('confirmResult.submitting')
              : error === null
                ? t('confirmResult.submit')
                : t('confirmResult.retry')}
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
