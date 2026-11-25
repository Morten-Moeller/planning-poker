import { Toast, ToastRegion, ToastTitle, createToaster } from '@ui-sdk/react/toast';
import { cardLabel } from './cards';
import type { Card } from './cards';
import styles from './confirm-success.module.css';
import { externalUrl } from './external-link';
import { t } from './messages';

export interface ConfirmSuccessData {
  card: Card;
  issueIid: number | null;
  webUrl: string | null;
}

export type ConfirmToaster = ReturnType<typeof createToaster>;

export const SUCCESS_DURATION_MS = 5000;

export function createConfirmToaster(): ConfirmToaster {
  return createToaster();
}

export function confirmSuccessText(data: ConfirmSuccessData): string {
  const value = cardLabel(data.card);
  return data.issueIid === null
    ? t('confirmResult.successWithoutIssue', { value })
    : t('confirmResult.success', { value, iid: data.issueIid });
}

export function showConfirmSuccess(toaster: ConfirmToaster, data: ConfirmSuccessData): void {
  toaster(confirmSuccessText(data), {
    duration: SUCCESS_DURATION_MS,
    data: { webUrl: externalUrl(data.webUrl) },
  });
}

function webUrlOf(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('webUrl' in data)) {
    return null;
  }
  return typeof data.webUrl === 'string' ? data.webUrl : null;
}

export function ConfirmSuccessRegion({ toaster }: { toaster: ConfirmToaster }) {
  return (
    <ToastRegion className={styles.region} toaster={toaster}>
      {(item) => {
        const webUrl = webUrlOf(item.data);
        return (
          <Toast className={styles.toast}>
            <span className={styles.label} data-testid="confirm-success">
              <ToastTitle className={styles.title} />
            </span>
            {webUrl !== null && (
              <a
                className={styles.open}
                data-testid="confirm-success-open"
                href={webUrl}
                target="_blank"
                rel="noopener"
              >
                {t('confirmResult.successOpen')}
              </a>
            )}
          </Toast>
        );
      }}
    </ToastRegion>
  );
}
