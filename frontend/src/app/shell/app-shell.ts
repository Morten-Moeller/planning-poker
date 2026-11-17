import { Component, computed, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { SessionStore } from '../api/session-store';
import { ErrorBanner } from './error-banner';

@Component({
  selector: 'app-shell',
  imports: [MatToolbarModule, RouterOutlet, ErrorBanner],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly store = inject(SessionStore);
  protected readonly session = this.store.session;
  protected readonly myName = computed(() => {
    const session = this.store.session();
    if (session === null) {
      return null;
    }
    const me = session.participants.find((p) => p.id === session.me.participantId);
    return me?.name ?? null;
  });
}
