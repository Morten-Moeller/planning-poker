import { Field, FieldDescription, FieldError, FieldLabel } from '@ui-sdk/react/field';
import { Input } from '@ui-sdk/react/input';
import type { ComponentProps } from 'react';
import styles from './text-field.module.css';

type InputProps = ComponentProps<typeof Input>;

export interface TextFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: InputProps['onBlur'];
  name?: string;
  autoComplete?: InputProps['autoComplete'];
  inputMode?: InputProps['inputMode'];
  maxLength?: number;
  disabled?: boolean;
  'data-testid'?: string;
  errorTestId?: string;
}

const ERROR_SYMBOL = '⚠';

export function TextField({
  label,
  hint,
  error,
  value,
  onChange,
  onBlur,
  name,
  autoComplete,
  inputMode,
  maxLength,
  disabled,
  'data-testid': testId,
  errorTestId,
}: TextFieldProps) {
  const hasError = error !== undefined && error !== '';
  const hasHint = hint !== undefined && hint !== '';

  return (
    <Field className={styles.field} disabled={disabled} invalid={hasError ? true : undefined}>
      <FieldLabel className={styles.label}>{label}</FieldLabel>
      <Input
        className={styles.input}
        value={value}
        onValueChange={(next) => onChange(next)}
        onBlur={onBlur}
        name={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        data-testid={testId}
      />
      {hasError && (
        <FieldError className={styles.error} match data-testid={errorTestId}>
          <span className={styles.errorSymbol} aria-hidden="true">
            {ERROR_SYMBOL}
          </span>{' '}
          {error}
        </FieldError>
      )}
      {!hasError && hasHint && <FieldDescription className={styles.hint}>{hint}</FieldDescription>}
    </Field>
  );
}
