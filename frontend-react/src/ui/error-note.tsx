import type { ReactNode } from 'react';
import styles from './error-note.module.css';

const SYMBOL_WARNING = '⚠';

export interface ErrorNoteProps {
  children: ReactNode;
  icon?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function ErrorNote({ children, icon = true, className, ...rest }: ErrorNoteProps) {
  return (
    <div
      className={className === undefined ? styles.note : `${styles.note} ${className}`}
      role="alert"
      data-testid={rest['data-testid']}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {SYMBOL_WARNING}
        </span>
      )}
      {children}
    </div>
  );
}
