import { Field, FieldDescription, FieldLabel } from '@ui-sdk/react/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import { useState } from 'react';
import { useBackend } from '../api/backend';
import { TIMER_OFF } from '../api/preferences-store';
import { t } from './messages';
import type { MessageKey } from './messages';
import styles from './timer-setting.module.css';
import { useSession } from './use-session';

export interface TimerOption {
  seconds: number;
  label: MessageKey;
}

export const TIMER_OPTIONS: readonly TimerOption[] = [
  { seconds: TIMER_OFF, label: 'timerSetting.off' },
  { seconds: 15, label: 'timerSetting.15s' },
  { seconds: 30, label: 'timerSetting.30s' },
  { seconds: 60, label: 'timerSetting.1min' },
  { seconds: 120, label: 'timerSetting.2min' },
  { seconds: 300, label: 'timerSetting.5min' },
];

export function TimerSetting({ sessionId }: { sessionId: string }) {
  const { api, preferences } = useBackend();
  const session = useSession();
  const [sending, setSending] = useState(false);
  const value = session?.timerSeconds ?? TIMER_OFF;
  const items = TIMER_OPTIONS.map((option) => ({
    value: String(option.seconds),
    label: t(option.label),
  }));

  const change = (seconds: number) => {
    setSending(true);
    api
      .setTimer(sessionId, { seconds: seconds === TIMER_OFF ? null : seconds })
      .then(
        () => preferences.save({ timerSeconds: seconds }),
        () => undefined,
      )
      .finally(() => setSending(false));
  };

  return (
    <Field className={styles.field}>
      <div className={styles.box}>
        <FieldLabel className={styles.label}>{t('timerSetting.label')}</FieldLabel>
        <Select
          items={items}
          value={String(value)}
          disabled={sending}
          onValueChange={(next) => {
            if (next !== null && next !== String(value)) {
              change(Number(next));
            }
          }}
        >
          <SelectTrigger className={styles.trigger} data-testid="timer-setting">
            <SelectValue className={styles.value} />
            <span className={styles.arrow} aria-hidden="true" />
          </SelectTrigger>
          <SelectContent className={styles.content} align="start" sideOffset={0}>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                className={styles.item}
                value={item.value}
                data-testid={`timer-option-${item.value}`}
              >
                {item.label}
                <SelectItemIndicator className={styles.check} aria-hidden="true" />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FieldDescription className={styles.hint} data-testid="timer-setting-hint">
        {t('timerSetting.hint')}
      </FieldDescription>
    </Field>
  );
}
