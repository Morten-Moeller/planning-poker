import { Component, DestroyRef, WritableSignal, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  debounce,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  merge,
  of,
  skip,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { ApiError, type ErrorCode } from '../api/api-error';
import { ApiService, IssueSummary, ProjectSummary, SessionView } from '../api/api.service';
import { CardHand } from '../api/card-hand';
import { errorMessage, formErrorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { participantNameValidators } from '../api/participant-name';
import { PreferencesStore, TIMER_OFF } from '../api/preferences-store';
import { RecentSession, RecentSessions } from '../api/recent-sessions';
import { TokenStore } from '../api/token-store';
import { HealthApi } from './health-api';

const NOT_BLANK = /\S/;
const WHOLE_NUMBER = /^\d+$/;
const ISSUE_NUMBER = /^\s*\d*\s*$/;
const PROJECT_NOT_FOUND = 'notFound';
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

export interface RecentSessionRow {
  entry: RecentSession;
  view: SessionView | null;
}

const GONE_SESSION_ERRORS: ReadonlySet<string> = new Set(['SESSION_NOT_FOUND', 'UNAUTHORIZED']);
const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;

interface SearchQuery {
  projectId: string;
  text: string;
  all?: boolean;
}

@Component({
  selector: 'app-start-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CardHand,
  ],
  templateUrl: './start-page.html',
  styleUrl: './start-page.scss',
  providers: [{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }],
})
export class StartPage {
  private readonly healthApi = inject(HealthApi);
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly saved = this.preferences.read();
  private readonly errorState = inject(ErrorState);
  private readonly router = inject(Router);
  private readonly recent = inject(RecentSessions);

  private readonly healthChecks = new Subject<void>();
  private readonly projectFocus = new Subject<void>();

  protected readonly backendReachable = toSignal(
    this.healthChecks.pipe(
      startWith(undefined),
      switchMap(() =>
        this.healthApi.status().pipe(
          map((health): boolean | undefined => health.status === 'UP'),
          catchError(() => of(false)),
          startWith(undefined),
        ),
      ),
    ),
    { initialValue: undefined },
  );

  protected readonly backendDown = linkedSignal<boolean | undefined, boolean>({
    source: this.backendReachable,
    computation: (reachable, previous) =>
      reachable === undefined ? (previous?.value ?? false) : !reachable,
  }).asReadonly();

  protected readonly createForm = new FormGroup({
    name: new FormControl(this.saved.name, {
      nonNullable: true,
      validators: participantNameValidators,
    }),
    gitlabProjectId: new FormControl(this.saved.projectId, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(NOT_BLANK)],
    }),
    issueIid: new FormControl('', {
      nonNullable: true,
      validators: [Validators.min(1), Validators.pattern(ISSUE_NUMBER)],
    }),
  });

  protected readonly createError = signal<string | null>(null);
  protected readonly projectNotFound = errorMessage('PROJECT_NOT_FOUND');
  protected readonly creating = signal(false);
  protected readonly projects = signal(idle<ProjectSummary>());
  protected readonly issues = signal(idle<IssueSummary>());
  protected readonly recentSessions = signal<RecentSessionRow[]>([]);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.loadRecentSessions(destroyRef);
    const projectText = textOf(this.createForm.controls.gitlabProjectId);
    const issueText = textOf(this.createForm.controls.issueIid);

    const projectField = this.createForm.controls.gitlabProjectId;
    merge(
      projectText.pipe(
        skip(1),
        map((text): SearchQuery => ({ projectId: '', text })),
      ),
      this.projectFocus.pipe(
        filter(() => projectField.value.trim() === ''),
        map((): SearchQuery => ({ projectId: '', text: '', all: true })),
      ),
    )
      .pipe(
        this.search(
          this.projects,
          (query) => query.all === true || (query.text !== '' && !WHOLE_NUMBER.test(query.text)),
          (query) => this.api.searchProjects(query.text === '' ? {} : { search: query.text }),
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

  private loadRecentSessions(destroyRef: DestroyRef): void {
    const enabled = this.recent.enabled();
    if (enabled === false) {
      this.recent.clear();
      return;
    }
    const entries = enabled === true ? this.recent.list() : [];
    if (entries.length === 0) {
      return;
    }
    forkJoin(entries.map((entry) => this.checkRecentSession(entry)))
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((rows) =>
        this.recentSessions.set(rows.filter((row): row is RecentSessionRow => row !== null)),
      );
  }

  private checkRecentSession(entry: RecentSession): Observable<RecentSessionRow | null> {
    return this.api.getSession(entry.sessionId).pipe(
      map((view): RecentSessionRow | null => ({ entry, view })),
      catchError((error: unknown) => {
        this.errorState.clear();
        if (error instanceof ApiError && GONE_SESSION_ERRORS.has(error.errorCode)) {
          this.tokens.remove(entry.sessionId);
          return of(null);
        }
        return of({ entry, view: null });
      }),
    );
  }

  protected removeRecentSession(sessionId: string): void {
    this.recent.remove(sessionId);
    this.recentSessions.update((rows) => rows.filter((row) => row.entry.sessionId !== sessionId));
  }

  protected lastUsed(entry: RecentSession): { value: number; unit: 'minute' | 'hour' | 'day' } {
    const minutes = Math.max(
      1,
      Math.floor((Date.now() - Date.parse(entry.lastUsedAt)) / MINUTE_MS),
    );
    if (minutes < HOUR_MINUTES) {
      return { value: minutes, unit: 'minute' };
    }
    const hours = Math.floor(minutes / HOUR_MINUTES);
    return hours < DAY_HOURS
      ? { value: hours, unit: 'hour' }
      : { value: Math.floor(hours / DAY_HOURS), unit: 'day' };
  }

  private search<T>(
    result: WritableSignal<SearchResult<T>>,
    searchable: (query: SearchQuery) => boolean,
    request: (query: SearchQuery) => Observable<{ items: T[] }>,
  ): (queries: Observable<SearchQuery>) => Observable<SearchResult<T>> {
    return (queries) => {
      let latest: SearchQuery | null = null;
      return queries.pipe(
        tap((query) => {
          latest = query;
          if (!searchable(query)) {
            result.set(idle());
          }
        }),
        debounce((query) => timer(query.all === true ? 0 : SEARCH_DELAY_MS)),
        switchMap((query) =>
          searchable(query)
            ? request(query).pipe(
                map((page): SearchResult<T> => ({
                  items: page.items,
                  searched: true,
                  error: null,
                })),
                catchError((error: unknown) => of(this.searchFailure<T>(error))),
                filter(() => latest === query),
              )
            : of(idle<T>()),
        ),
        tap((next) => result.set(next)),
      );
    };
  }

  private searchFailure<T>(error: unknown): SearchResult<T> {
    const message = formErrorMessage(error, SEARCH_ERRORS);
    if (message === null) {
      return idle();
    }
    this.errorState.clear();
    return { items: [], searched: true, error: message };
  }

  protected showAllProjects(): void {
    this.projectFocus.next();
  }

  protected checkBackend(): void {
    this.healthChecks.next();
  }

  protected createSession(): void {
    this.createError.set(null);
    if (this.backendDown()) {
      return;
    }
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { name, gitlabProjectId, issueIid } = this.createForm.getRawValue();
    const participantName = name.trim();
    const projectId = gitlabProjectId.trim();
    const issue = issueIid.trim();
    this.creating.set(true);
    this.api
      .createSession({
        name: participantName,
        gitlabProjectId: projectId,
        ...(issue === '' ? {} : { issueIid: Number(issue) }),
      })
      .subscribe({
        next: ({ sessionId, participantId, token }) => {
          this.tokens.store(
            sessionId,
            { participantId, token },
            { role: 'SCRUM_MASTER', name: participantName },
          );
          this.preferences.save({ name: participantName, projectId });
          this.applySavedTimer(sessionId);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          if (error instanceof ApiError && error.errorCode === 'PROJECT_NOT_FOUND') {
            this.errorState.clear();
            const project = this.createForm.controls.gitlabProjectId;
            project.setErrors({ [PROJECT_NOT_FOUND]: true });
            project.markAsTouched();
            return;
          }
          const message = formErrorMessage(error, CREATE_FORM_ERRORS);
          if (message !== null) {
            this.errorState.clear();
            this.createError.set(message);
          }
        },
      });
  }

  private applySavedTimer(sessionId: string): void {
    const enter = (): void => void this.router.navigate(['/session', sessionId]);
    const seconds = this.preferences.read().timerSeconds;
    if (seconds === TIMER_OFF) {
      enter();
      return;
    }
    this.api.setTimer(sessionId, { seconds }).subscribe({ next: enter, error: enter });
  }
}

function textOf(control: AbstractControl<string>): Observable<string> {
  return control.valueChanges.pipe(
    startWith(control.value),
    map((value) => value.trim()),
    distinctUntilChanged(),
  );
}
