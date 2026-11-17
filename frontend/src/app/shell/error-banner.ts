import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { errorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { RealtimeService } from '../api/realtime.service';

const TICK_MS = 250;

@Component({
  selector: 'app-error-banner',
  imports: [MatButtonModule],
  templateUrl: './error-banner.html',
  styleUrl: './error-banner.scss',
})
export class ErrorBanner {
  private readonly errorState = inject(ErrorState);
  private readonly realtime = inject(RealtimeService);
  private readonly now = signal(Date.now());

  protected readonly message = computed(() => {
    const error = this.errorState.error();
    return error === null ? null : errorMessage(error.errorCode);
  });

  protected readonly connectionLost = computed(() => this.realtime.connection().status !== 'OPEN');

  protected readonly secondsLeft = computed(() => {
    const connection = this.realtime.connection();
    if (connection.status !== 'WAITING') {
      return null;
    }
    return Math.max(0, Math.ceil((connection.retryAt - this.now()) / 1000));
  });

  constructor() {
    effect((onCleanup) => {
      if (this.realtime.connection().status !== 'WAITING') {
        return;
      }
      this.now.set(Date.now());
      const tick = setInterval(() => this.now.set(Date.now()), TICK_MS);
      onCleanup(() => clearInterval(tick));
    });
  }

  protected close(): void {
    this.errorState.clear();
  }

  protected reconnect(): void {
    this.realtime.reconnectNow();
  }
}
