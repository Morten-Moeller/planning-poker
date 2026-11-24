import { Button } from '@ui-sdk/react/button';
import type { ComponentProps, ReactNode } from 'react';
import styles from './app-button.module.css';

export type AppButtonVariant = 'filled' | 'outlined' | 'text';
export type AppButtonTone = 'default' | 'on-error';

export type AppButtonProps = Omit<ComponentProps<typeof Button>, 'className' | 'children'> & {
  variant: AppButtonVariant;
  tone?: AppButtonTone;
  className?: string;
  children?: ReactNode;
};

export function AppButton({
  variant,
  tone = 'default',
  className,
  children,
  ...props
}: AppButtonProps) {
  return (
    <Button
      {...props}
      className={className === undefined ? styles.button : `${styles.button} ${className}`}
      data-variant={variant}
      data-tone={tone}
    >
      <span className={styles.spinner} data-show="pending" aria-hidden="true" />
      {children}
    </Button>
  );
}
