import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface SwitchIssueData {
  revealed: boolean;
  roundNumber: number;
  issueIid: number;
  votes: number;
}

@Component({
  selector: 'app-switch-issue-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './switch-issue-dialog.html',
})
export class SwitchIssueDialog {
  protected readonly data = inject<SwitchIssueData>(MAT_DIALOG_DATA);
}
