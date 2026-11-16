import { Component, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { SessionStore } from '../api/session-store';
import { cardName, cardSymbol } from './cards';
import { averageText } from './round-stats';

@Component({
  selector: 'app-session-history',
  imports: [MatExpansionModule],
  templateUrl: './session-history.html',
  styleUrl: './session-history.scss',
})
export class SessionHistory {
  protected readonly store = inject(SessionStore);

  protected readonly symbol = cardSymbol;
  protected readonly name = cardName;
  protected readonly average = averageText;
}
