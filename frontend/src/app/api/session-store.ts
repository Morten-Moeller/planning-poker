import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, switchMap, tap } from 'rxjs';
import { ApiService, SessionView } from './api.service';
import { RealtimeService } from './realtime.service';
import { TokenStore } from './token-store';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(ApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly tokens = inject(TokenStore);
  private readonly snapshot = signal<SessionView | null>(null);
  private readonly offset = signal(0);
  private connection: Subscription | null = null;

  readonly session = this.snapshot.asReadonly();
  readonly me = computed(() => this.snapshot()?.me ?? null);
  readonly role = computed(() => this.me()?.role ?? null);
  readonly isScrumMaster = computed(() => this.role() === 'SCRUM_MASTER');
  readonly phase = computed(() => this.snapshot()?.phase ?? null);
  readonly participants = computed(() => this.snapshot()?.participants ?? []);
  readonly activeIssue = computed(() => this.snapshot()?.activeIssue ?? null);
  readonly round = computed(() => this.snapshot()?.round ?? null);
  readonly history = computed(() => this.snapshot()?.history ?? []);
  readonly timerSeconds = computed(() => this.snapshot()?.timerSeconds ?? null);
  readonly deadline = computed(() => this.snapshot()?.round?.deadline ?? null);
  readonly clockOffset = this.offset.asReadonly();

  enter(sessionId: string): void {
    this.leave();
    const identity = this.tokens.identity(sessionId);
    if (identity === null) {
      return;
    }
    this.connection = this.api
      .getSession(sessionId)
      .pipe(
        tap((view) => this.apply(view)),
        switchMap(() => this.realtime.connect(sessionId, identity.token)),
      )
      .subscribe({
        next: (view) => this.apply(view),
        error: () => this.snapshot.set(null),
        complete: () => this.snapshot.set(null),
      });
  }

  serverNow(): number {
    return Date.now() + this.offset();
  }

  private apply(view: SessionView): void {
    const serverTime = Date.parse(view.serverTime);
    this.offset.set(Number.isNaN(serverTime) ? 0 : serverTime - Date.now());
    this.snapshot.set(view);
  }

  leave(): void {
    this.connection?.unsubscribe();
    this.connection = null;
    this.snapshot.set(null);
  }
}
