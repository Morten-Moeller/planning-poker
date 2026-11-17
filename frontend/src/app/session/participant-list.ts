import { Component, computed, inject } from '@angular/core';
import { SessionStore } from '../api/session-store';

@Component({
  selector: 'app-participant-list',
  templateUrl: './participant-list.html',
  styleUrl: './participant-list.scss',
})
export class ParticipantList {
  protected readonly store = inject(SessionStore);
  protected readonly myId = computed(() => this.store.me()?.participantId ?? null);
  protected readonly round = computed(() => {
    const phase = this.store.phase();
    return phase === 'VOTING' || phase === 'REVEALED';
  });
}
