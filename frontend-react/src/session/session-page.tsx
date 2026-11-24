import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useBackend } from '../api/backend';
import { t } from './messages';
import styles from './session-page.module.css';

const SESSION_NOT_FOUND = 'SESSION_NOT_FOUND';

function SessionRoom({ sessionId }: { sessionId: string }) {
  const { errors, sessions, tokens } = useBackend();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const unsubscribe = errors.subscribe(() => {
      if (errors.error()?.errorCode !== SESSION_NOT_FOUND) {
        return;
      }
      errors.clear();
      tokens.remove(sessionId);
      sessions.leave();
      setGone(true);
    });
    sessions.enter(sessionId);
    return () => {
      unsubscribe();
      sessions.leave();
    };
  }, [errors, sessions, tokens, sessionId]);

  if (gone) {
    return (
      <div className={styles.gone} role="alert" data-testid="session-gone">
        <p className={styles.goneText}>{t('session.gone')}</p>
        <Link to="/" data-testid="session-gone-home">
          {t('session.goneHome')}
        </Link>
      </div>
    );
  }
  return <p data-testid="session-loading">{t('session.loading')}</p>;
}

export function SessionPage() {
  const { id = '' } = useParams();

  return <SessionRoom key={id} sessionId={id} />;
}
