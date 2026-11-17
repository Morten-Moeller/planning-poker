import { Component, inject } from '@angular/core';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
} from '@angular/material/snack-bar';
import { Card, cardLabel } from './cards';

export interface ConfirmSuccessData {
  card: Card;
  issueIid: number | null;
  webUrl: string | null;
}

@Component({
  selector: 'app-confirm-success',
  imports: [MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
  templateUrl: './confirm-success.html',
  styleUrl: './confirm-success.scss',
})
export class ConfirmSuccess {
  protected readonly data = inject<ConfirmSuccessData>(MAT_SNACK_BAR_DATA);
  protected readonly value = cardLabel(this.data.card);
}
