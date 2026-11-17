import { Component, computed, inject } from '@angular/core';
import type { components } from '../api/schema';
import { SessionStore } from '../api/session-store';
import { cardName, cardSymbol } from './cards';

type SessionView = components['schemas']['SessionView'];
type HistoryEntry = components['schemas']['HistoryEntryView'];

export function lastConfirmed(session: SessionView | null): HistoryEntry | null {
  if (session === null || session.phase !== 'LOBBY' || session.me.role !== 'DEVELOPER') {
    return null;
  }
  const latest = session.history[0];
  return latest?.finalCard ? latest : null;
}

@Component({
  selector: 'app-last-result',
  templateUrl: './last-result.html',
  styleUrl: './last-result.scss',
})
export class LastResult {
  private readonly store = inject(SessionStore);

  protected readonly entry = computed(() => lastConfirmed(this.store.session()));
  protected readonly issueUrl = computed(() => {
    const entry = this.entry();
    const project = this.store.session()?.project ?? null;
    return entry === null || project === null
      ? null
      : `${project.webUrl}/-/issues/${entry.issueIid}`;
  });
  protected readonly symbol = cardSymbol;
  protected readonly name = cardName;
}
