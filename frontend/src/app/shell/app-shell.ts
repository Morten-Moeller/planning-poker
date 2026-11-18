import { Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterOutlet } from '@angular/router';
import { SessionStore } from '../api/session-store';
import { ErrorBanner } from './error-banner';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-shell',
  imports: [MatToolbarModule, MatIconButton, MatTooltip, RouterOutlet, ErrorBanner],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly store = inject(SessionStore);
  protected readonly theme = inject(ThemeService);
  protected readonly themeLabel = computed(() =>
    this.theme.dark()
      ? $localize`:@@shell.theme.light:Helles Design`
      : $localize`:@@shell.theme.dark:Dunkles Design`,
  );
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
