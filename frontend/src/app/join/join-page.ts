import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import type { ErrorCode } from '../api/api-error';
import { ApiService } from '../api/api.service';
import { formErrorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { participantNameValidators } from '../api/participant-name';
import { TokenStore } from '../api/token-store';

const JOIN_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'SESSION_NOT_FOUND',
  'NAME_TAKEN',
  'VALIDATION_ERROR',
]);

@Component({
  selector: 'app-join-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
})
export class JoinPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly errorState = inject(ErrorState);
  private readonly router = inject(Router);

  protected readonly sessionId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly joinForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: participantNameValidators,
    }),
  });

  protected readonly joinError = signal<string | null>(null);
  protected readonly joining = signal(false);

  protected join(): void {
    this.joinError.set(null);
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }
    const sessionId = this.sessionId();
    this.joining.set(true);
    this.api.joinSession(sessionId, { name: this.joinForm.controls.name.value.trim() }).subscribe({
      next: ({ participantId, token }) => {
        this.tokens.store(sessionId, { participantId, token });
        void this.router.navigate(['/session', sessionId]);
      },
      error: (error: unknown) => {
        this.joining.set(false);
        const message = formErrorMessage(error, JOIN_FORM_ERRORS);
        if (message !== null) {
          this.errorState.clear();
          this.joinError.set(message);
        }
      },
    });
  }
}
