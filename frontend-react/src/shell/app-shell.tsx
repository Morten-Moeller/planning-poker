import { Toggle } from '@ui-sdk/react/toggle';
import { useSyncExternalStore } from 'react';
import { Link, Outlet } from 'react-router';
import { t } from '../i18n/messages';
import styles from './app-shell.module.css';
import type { ThemeStore } from './theme-store';

const SYMBOL_DARK = '☀️';
const SYMBOL_LIGHT = '🌙';

export function AppShell({ theme }: { theme: ThemeStore }) {
  const dark = useSyncExternalStore(theme.subscribe, theme.dark);

  return (
    <div className={styles.shell}>
      <header className={styles.toolbar} data-testid="toolbar">
        <Link className={styles.title} to="/" data-testid="toolbar-home">
          {t('shell.title')}
        </Link>
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
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
