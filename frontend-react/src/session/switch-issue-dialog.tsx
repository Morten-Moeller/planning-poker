import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@ui-sdk/react/dialog';
import { AppButton } from '../ui/app-button';
import { t } from './messages';
import styles from './switch-issue-dialog.module.css';

export interface SwitchIssueData {
  revealed: boolean;
  roundNumber: number;
  issueIid: number;
  votes: number;
}

export function switchIssueText(data: SwitchIssueData): string {
  const values = { round: data.roundNumber, iid: data.issueIid };
  if (data.revealed) {
    return t('switchIssue.textRevealed', values);
  }
  if (data.votes === 0) {
    return t('switchIssue.textRunningNone', values);
  }
  return t('switchIssue.textRunning', { ...values, count: data.votes });
}

export function SwitchIssueDialog({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: SwitchIssueData;
  onClose: (confirmed: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose(false);
        }
      }}
    >
      <DialogBackdrop className={styles.backdrop} />
      <DialogContent className={styles.dialog} data-testid="switch-dialog">
        <DialogTitle className={styles.title}>{t('switchIssue.title')}</DialogTitle>
        <DialogDescription className={styles.text} data-testid="switch-text">
          {switchIssueText(data)}
        </DialogDescription>
        <div className={styles.actions}>
          <AppButton variant="text" data-testid="switch-cancel" onClick={() => onClose(false)}>
            {t('switchIssue.cancel')}
          </AppButton>
          <AppButton variant="filled" data-testid="switch-confirm" onClick={() => onClose(true)}>
            {t('switchIssue.confirm')}
          </AppButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
