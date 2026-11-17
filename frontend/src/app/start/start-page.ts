import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import type { ErrorCode } from '../api/api-error';
import { ApiService } from '../api/api.service';
import { formErrorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { participantNameValidators } from '../api/participant-name';
import { TokenStore } from '../api/token-store';
import { HealthApi } from './health-api';

const SESSION_ID_PATTERN = /^[A-Z2-9]{8}$/;
const NOT_BLANK = /\S/;
const WHOLE_NUMBER = /^\d+$/;
const CREATE_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'ISSUE_NOT_FOUND',
  'PROJECT_NOT_ALLOWED',
  'LIMIT_REACHED',
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
  'VALIDATION_ERROR',
]);

@Component({
  selector: 'app-start-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './start-page.html',
  styleUrl: './start-page.scss',
})
export class StartPage {
  private readonly healthApi = inject(HealthApi);
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly errorState = inject(ErrorState);
  private readonly router = inject(Router);

  protected readonly backendReachable = toSignal(
    this.healthApi.status().pipe(
      map((health) => health.status === 'UP'),
      catchError(() => of(false)),
    ),
    { initialValue: undefined },
  );

  protected readonly createForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: participantNameValidators,
    }),
    gitlabProjectId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(NOT_BLANK)],
    }),
    issueIid: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.pattern(WHOLE_NUMBER)],
    }),
  });

  protected readonly joinForm = new FormGroup({
    sessionId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SESSION_ID_PATTERN)],
    }),
  });

  protected readonly createError = signal<string | null>(null);
  protected readonly creating = signal(false);

  protected createSession(): void {
    this.createError.set(null);
    const issueIid = this.createForm.controls.issueIid.value;
    if (this.createForm.invalid || issueIid === null) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { name, gitlabProjectId } = this.createForm.getRawValue();
    this.creating.set(true);
    this.api
      .createSession({ name: name.trim(), gitlabProjectId: gitlabProjectId.trim(), issueIid })
      .subscribe({
        next: ({ sessionId, participantId, token }) => {
          this.tokens.store(sessionId, { participantId, token });
          void this.router.navigate(['/session', sessionId]);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          const message = formErrorMessage(error, CREATE_FORM_ERRORS);
          if (message !== null) {
            this.errorState.clear();
            this.createError.set(message);
          }
        },
      });
  }

  protected uppercaseSessionId(): void {
    const control = this.joinForm.controls.sessionId;
    const normalized = control.value.trim().toUpperCase();
    if (normalized !== control.value) {
      control.setValue(normalized);
    }
  }

  protected joinBySessionId(): void {
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/session', this.joinForm.controls.sessionId.value, 'join']);
  }
}
