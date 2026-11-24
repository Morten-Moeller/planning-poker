import { useCallback, useSyncExternalStore } from 'react';
import { useBackend, useConnection, useLastError } from '../api/backend';
import { errorMessage } from '../api/error-messages';
import { AppButton } from '../ui/app-button';
import { t } from './messages';
import styles from './error-banner.module.css';

const TICK_MS = 250;
const SYMBOL_WARNING = '⚠';

function useSecondsLeft(retryAt: number | null): number | null {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (retryAt === null) {
        return () => undefined;
      }
      const tick = setInterval(listener, TICK_MS);
      return () => clearInterval(tick);
    },
    [retryAt],
  );
  return useSyncExternalStore(subscribe, () =>
    retryAt === null ? null : Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)),
  );
}

export function ErrorBanner() {
  const { errors, realtime } = useBackend();
  const error = useLastError();
  const connection = useConnection();
  const secondsLeft = useSecondsLeft(connection.status === 'WAITING' ? connection.retryAt : null);

  return (
    <>
      {connection.status !== 'OPEN' && (
        <div className={styles.banner} role="alert" data-testid="connection-banner">
          <span className={styles.title}>
            <span className="app-symbol" aria-hidden="true">
              {SYMBOL_WARNING}
            </span>{' '}
            {t('connection.lost')}
          </span>
          <span data-testid="connection-retry">
            {secondsLeft === null
              ? t('connection.connecting')
              : t('connection.retryIn', { seconds: secondsLeft })}
          </span>
          <span className={styles.spacer} />
          <AppButton
            variant="outlined"
            tone="on-error"
            data-testid="connection-reconnect"
            disabled={secondsLeft === null}
            onClick={() => realtime.reconnectNow()}
          >
            {t('connection.reconnect')}
          </AppButton>
        </div>
      )}
      {error !== null && (
        <div className={styles.banner} role="alert" data-testid="error-banner">
          <span data-testid="error-message">{errorMessage(error.errorCode)}</span>
          <AppButton
            variant="text"
            tone="on-error"
            data-testid="error-close"
            onClick={() => errors.clear()}
          >
            {t('error.close')}
          </AppButton>
        </div>
      )}
    </>
  );
}
