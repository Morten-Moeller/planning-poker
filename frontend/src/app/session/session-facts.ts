import { Component, computed, inject } from '@angular/core';
import { SessionStore } from '../api/session-store';

@Component({
  selector: 'app-session-facts',
  templateUrl: './session-facts.html',
  styleUrl: './session-facts.scss',
})
export class SessionFacts {
  protected readonly store = inject(SessionStore);
  protected readonly developers = computed(
    () =>
      this.store.participants().filter((participant) => participant.role === 'DEVELOPER').length,
  );
  protected readonly viewers = computed(
    () => this.store.participants().filter((participant) => participant.role === 'VIEWER').length,
  );
}
