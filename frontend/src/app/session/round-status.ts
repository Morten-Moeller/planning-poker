import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';

@Component({
  selector: 'app-round-status',
  imports: [MatButtonModule],
  templateUrl: './round-status.html',
  styleUrl: './round-status.scss',
})
export class RoundStatus {
  private readonly api = inject(ApiService);
  protected readonly store = inject(SessionStore);

  readonly sessionId = input.required<string>();

  private readonly connectedDevelopers = computed(() =>
    this.store
      .participants()
      .filter((participant) => participant.role === 'DEVELOPER' && participant.connected),
  );
  protected readonly total = computed(() => this.connectedDevelopers().length);
  protected readonly voted = computed(
    () => this.connectedDevelopers().filter((participant) => participant.hasVoted).length,
  );
  protected readonly allVoted = computed(() => this.store.round()?.allVoted === true);
  protected readonly revealing = signal(false);

  protected reveal(): void {
    if (this.revealing()) {
      return;
    }
    this.revealing.set(true);
    this.api.revealRound(this.sessionId()).subscribe({
      next: () => this.revealing.set(false),
      error: () => this.revealing.set(false),
    });
  }
}
