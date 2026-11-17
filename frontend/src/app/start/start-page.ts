import { Component, DestroyRef, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  skip,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import type { ErrorCode } from '../api/api-error';
import { ApiService, IssueSummary, ProjectSummary } from '../api/api.service';
import { formErrorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { participantNameValidators } from '../api/participant-name';
import { TokenStore } from '../api/token-store';
import { HealthApi } from './health-api';

const SESSION_ID_PATTERN = /^[A-Z2-9]{8}$/;
const NOT_BLANK = /\S/;
const WHOLE_NUMBER = /^\d+$/;
const ISSUE_NUMBER = /^\s*\d+\s*$/;
const SEARCH_DELAY_MS = 300;
const CREATE_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'ISSUE_NOT_FOUND',
  'PROJECT_NOT_ALLOWED',
  'LIMIT_REACHED',
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
  'VALIDATION_ERROR',
]);
const SEARCH_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'PROJECT_NOT_ALLOWED',
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
]);

export interface SearchResult<T> {
  items: T[];
  searched: boolean;
  error: string | null;
}

function idle<T>(): SearchResult<T> {
  return { items: [], searched: false, error: null };
}

interface SearchQuery {
  projectId: string;
  text: string;
}

@Component({
  selector: 'app-start-page',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
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
    issueIid: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.pattern(ISSUE_NUMBER)],
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
  protected readonly projects = signal(idle<ProjectSummary>());
  protected readonly issues = signal(idle<IssueSummary>());

  constructor() {
    const destroyRef = inject(DestroyRef);
    const projectText = textOf(this.createForm.controls.gitlabProjectId.valueChanges);
    const issueText = textOf(this.createForm.controls.issueIid.valueChanges);

    projectText
      .pipe(
        skip(1),
        map((text) => ({ projectId: '', text })),
        this.search(
          this.projects,
          (query) => query.text !== '' && !WHOLE_NUMBER.test(query.text),
          (query) => this.api.searchProjects({ search: query.text }),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();

    combineLatest([projectText, issueText])
      .pipe(
        map(([projectId, text]) => ({ projectId, text })),
        this.search(
          this.issues,
          (query) => WHOLE_NUMBER.test(query.projectId) && !WHOLE_NUMBER.test(query.text),
          (query) =>
            this.api.searchProjectIssues(
              query.projectId,
              query.text === '' ? {} : { search: query.text },
            ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();
  }

  private search<T>(
    result: WritableSignal<SearchResult<T>>,
    searchable: (query: SearchQuery) => boolean,
    request: (query: SearchQuery) => Observable<{ items: T[] }>,
  ): (queries: Observable<SearchQuery>) => Observable<SearchResult<T>> {
    return (queries) =>
      queries.pipe(
        tap((query) => {
          if (!searchable(query)) {
            result.set(idle());
          }
        }),
        debounceTime(SEARCH_DELAY_MS),
        switchMap((query) =>
          searchable(query)
            ? request(query).pipe(
                map((page): SearchResult<T> => ({
                  items: page.items,
                  searched: true,
                  error: null,
                })),
                catchError((error: unknown) => of(this.searchFailure<T>(error))),
              )
            : of(idle<T>()),
        ),
        tap((next) => result.set(next)),
      );
  }

  private searchFailure<T>(error: unknown): SearchResult<T> {
    const message = formErrorMessage(error, SEARCH_ERRORS);
    if (message === null) {
      return idle();
    }
    this.errorState.clear();
    return { items: [], searched: true, error: message };
  }

  protected createSession(): void {
    this.createError.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { name, gitlabProjectId, issueIid } = this.createForm.getRawValue();
    this.creating.set(true);
    this.api
      .createSession({
        name: name.trim(),
        gitlabProjectId: gitlabProjectId.trim(),
        issueIid: Number(issueIid.trim()),
      })
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

function textOf(values: Observable<string>): Observable<string> {
  return values.pipe(
    startWith(''),
    map((value) => value.trim()),
    distinctUntilChanged(),
  );
}
