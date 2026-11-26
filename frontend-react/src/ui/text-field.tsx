import { Field, FieldDescription, FieldError, FieldLabel } from '@ui-sdk/react/field';
import { Input } from '@ui-sdk/react/input';
import type { ComponentProps, ReactNode } from 'react';
import styles from './text-field.module.css';

type InputProps = ComponentProps<typeof Input>;

export type TextFieldSize = 'compact';

export interface TextFieldInputProps {
  className: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: InputProps['onBlur'];
  name?: string;
  autoComplete?: InputProps['autoComplete'];
  inputMode?: InputProps['inputMode'];
  maxLength?: number;
  'data-testid'?: string;
  'data-size'?: TextFieldSize;
}

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
  size?: TextFieldSize;
  'data-testid'?: string;
  errorTestId?: string;
  renderInput?: (input: TextFieldInputProps) => ReactNode;
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
  size,
  'data-testid': testId,
  errorTestId,
  renderInput,
}: TextFieldProps) {
  const hasError = error !== undefined && error !== '';
  const hasHint = hint !== undefined && hint !== '';

  return (
    <Field className={styles.field} disabled={disabled} invalid={hasError ? true : undefined}>
      <FieldLabel className={styles.label}>{label}</FieldLabel>
      {renderInput === undefined ? (
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
          data-size={size}
        />
      ) : (
        renderInput({
          className: styles.input,
          value,
          onChange,
          onBlur,
          name,
          autoComplete,
          inputMode,
          maxLength,
          'data-testid': testId,
          'data-size': size,
        })
      )}
      {hasError && (
        <FieldError className={styles.error} match>
          <span className={styles.errorSymbol} aria-hidden="true">
            {ERROR_SYMBOL}
          </span>{' '}
          <span data-testid={errorTestId}>{error}</span>
        </FieldError>
      )}
      {!hasError && hasHint && <FieldDescription className={styles.hint}>{hint}</FieldDescription>}
    </Field>
  );
}
