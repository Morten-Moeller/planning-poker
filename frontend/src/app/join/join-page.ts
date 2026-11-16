import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ApiService } from '../api/api.service';
import { TokenStore } from '../api/token-store';

@Component({
  selector: 'app-join-page',
  imports: [MatButtonModule],
  templateUrl: './join-page.html',
})
export class JoinPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly router = inject(Router);

  protected readonly sessionId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  protected join(): void {
    const sessionId = this.sessionId();
    this.api.joinSession(sessionId, { name: 'Ben' }).subscribe({
      next: ({ participantId, token }) => {
        this.tokens.store(sessionId, { participantId, token });
        void this.router.navigate(['/session', sessionId]);
      },
      error: () => undefined,
    });
  }
}
