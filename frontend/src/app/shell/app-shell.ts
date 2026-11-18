import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessionStore } from '../api/session-store';
import { ErrorBanner } from './error-banner';
import { ThemeService } from './theme.service';

const JOIN_PATH = /^\/session\/([^/?#]+)\/join(?:[?#]|$)/;
const SESSION_ID = /^[A-HJKMNP-Z2-9]{8}$/;

function joinSessionId(url: string): string | null {
  const match = JOIN_PATH.exec(url);
  if (match === null) {
    return null;
  }
  const id = match[1].toUpperCase();
  return SESSION_ID.test(id) ? id : null;
}

@Component({
  selector: 'app-shell',
  imports: [MatToolbarModule, MatIconButton, MatTooltip, RouterLink, RouterOutlet, ErrorBanner],
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
  private readonly joinId = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => joinSessionId(event.urlAfterRedirects)),
    ),
    { initialValue: null },
  );
  protected readonly sessionId = computed(
    () => this.store.session()?.sessionId ?? this.joinId() ?? null,
  );
  protected readonly myName = computed(() => {
    const session = this.store.session();
    if (session === null) {
      return null;
    }
    const me = session.participants.find((p) => p.id === session.me.participantId);
    return me?.name ?? null;
  });
}
