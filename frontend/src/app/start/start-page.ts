import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../api/api.service';
import { TokenStore } from '../api/token-store';
import { HealthApi } from './health-api';

@Component({
  selector: 'app-start-page',
  imports: [MatButtonModule],
  templateUrl: './start-page.html',
})
export class StartPage {
  private readonly healthApi = inject(HealthApi);
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly router = inject(Router);

  protected readonly backendReachable = toSignal(
    this.healthApi.status().pipe(
      map((health) => health.status === 'UP'),
      catchError(() => of(false)),
    ),
    { initialValue: undefined },
  );

  protected createSession(): void {
    this.api.createSession({ name: 'Anna', gitlabProjectId: '1234', issueIid: 42 }).subscribe({
      next: ({ sessionId, participantId, token }) => {
        this.tokens.store(sessionId, { participantId, token });
        void this.router.navigate(['/session', sessionId]);
      },
      error: () => undefined,
    });
  }
}
