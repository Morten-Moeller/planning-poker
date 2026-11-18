import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiError, type ErrorCode } from '../api/api-error';
import { ApiService } from '../api/api.service';
import { CardHand } from '../api/card-hand';
import { formErrorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { participantNameValidators } from '../api/participant-name';
import { PreferencesStore } from '../api/preferences-store';
import { TokenStore } from '../api/token-store';

const JOIN_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'SESSION_NOT_FOUND',
  'NAME_TAKEN',
  'LIMIT_REACHED',
  'VALIDATION_ERROR',
]);

@Component({
  selector: 'app-join-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CardHand,
  ],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
  providers: [{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }],
})
export class JoinPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly errorState = inject(ErrorState);
  private readonly router = inject(Router);

  protected readonly sessionId = toSignal(
    this.route.paramMap.pipe(map((params) => (params.get('id') ?? '').toUpperCase())),
    { initialValue: '' },
  );

  protected readonly joinForm = new FormGroup({
    name: new FormControl(this.preferences.read().name, {
      nonNullable: true,
      validators: participantNameValidators,
    }),
  });

  protected readonly joinError = signal<string | null>(null);
  protected readonly joining = signal(false);
  protected readonly sessionNotFound = signal(false);

  protected join(): void {
    this.joinError.set(null);
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }
    const sessionId = this.sessionId();
    const name = this.joinForm.controls.name.value.trim();
    this.joining.set(true);
    this.api.joinSession(sessionId, { name }).subscribe({
      next: ({ participantId, token }) => {
        this.tokens.store(sessionId, { participantId, token }, { role: 'DEVELOPER', name });
        this.preferences.save({ name });
        void this.router.navigate(['/session', sessionId]);
      },
      error: (error: unknown) => {
        this.joining.set(false);
        const message = formErrorMessage(error, JOIN_FORM_ERRORS);
        if (message === null) {
          return;
        }
        this.errorState.clear();
        const code = error instanceof ApiError ? error.errorCode : null;
        if (code === 'SESSION_NOT_FOUND') {
          this.sessionNotFound.set(true);
        } else if (code === 'NAME_TAKEN') {
          const name = this.joinForm.controls.name;
          name.setErrors({ nameTaken: message });
          name.markAsTouched();
        } else {
          this.joinError.set(message);
        }
      },
    });
  }
}
