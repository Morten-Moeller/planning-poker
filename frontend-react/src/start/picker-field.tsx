import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@ui-sdk/react/autocomplete';
import type { ReactNode } from 'react';
import { TextField } from '../ui/text-field';
import styles from './picker-field.module.css';

export interface PickerOption {
  value: string;
  content: ReactNode;
}

export interface PickerFieldProps {
  label: string;
  hint: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  options: readonly PickerOption[];
  emptyText: string | null;
  'data-testid': string;
  errorTestId: string;
  optionTestId: string;
  emptyTestId: string;
}

const EMPTY_VALUE = '';

export function PickerField({
  label,
  hint,
  error,
  value,
  onChange,
  onFocus,
  onBlur,
  options,
  emptyText,
  'data-testid': testId,
  errorTestId,
  optionTestId,
  emptyTestId,
}: PickerFieldProps) {
  return (
    <TextField
      label={label}
      hint={hint}
      error={error}
      value={value}
      onChange={onChange}
      autoComplete="off"
      data-testid={testId}
      errorTestId={errorTestId}
      renderInput={(input) => (
        <Autocomplete
          value={input.value}
          onValueChange={(next) => input.onChange(next)}
          filter={false}
          openOnFocus
        >
          <AutocompleteInput
            className={input.className}
            autoComplete={input.autoComplete}
            data-testid={input['data-testid']}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <AutocompleteContent className={styles.panel} sideOffset={4}>
            <AutocompleteList className={styles.list}>
              {options.map((option) => (
                <AutocompleteItem
                  key={option.value}
                  className={styles.option}
                  value={option.value}
                  label={option.value}
                  data-testid={optionTestId}
                >
                  {option.content}
                </AutocompleteItem>
              ))}
              {options.length === 0 && emptyText !== null && (
                <AutocompleteItem
                  className={styles.option}
                  value={EMPTY_VALUE}
                  label={EMPTY_VALUE}
                  disabled
                  data-testid={emptyTestId}
                >
                  {emptyText}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompleteContent>
        </Autocomplete>
      )}
    />
  );
}
