import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-switch-issue-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './switch-issue-dialog.html',
})
export class SwitchIssueDialog {}
