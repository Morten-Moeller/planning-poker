import { Component, OnInit, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { filter } from 'rxjs';
import { ApiService, IssueListResponse, IssueQuery } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { SwitchIssueDialog } from './switch-issue-dialog';

export type IssueSummary = IssueListResponse['items'][number];

@Component({
  selector: 'app-issue-panel',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './issue-panel.html',
  styleUrl: './issue-panel.scss',
})
export class IssuePanel implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(SessionStore);

  readonly sessionId = input.required<string>();

  protected readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly results = signal<IssueSummary[]>([]);
  protected readonly nextPage = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly releasing = signal(false);
  private search: string | undefined;

  protected readonly activeIid = computed(() => this.store.activeIssue()?.iid ?? null);
  private readonly defaultIid = computed(
    () => this.activeIid() ?? this.store.session()?.preselectedIssueIid ?? null,
  );
  protected readonly selectedIid = linkedSignal<number | null>(() => this.defaultIid());
  protected readonly selected = computed(() => {
    const iid = this.selectedIid();
    if (iid === null) {
      return null;
    }
    return this.results().find((issue) => issue.iid === iid) ?? { iid, title: null, webUrl: null };
  });
  protected readonly inLobby = computed(() => this.store.phase() === 'LOBBY');
  protected readonly releaseDisabled = computed(
    () =>
      this.releasing() ||
      this.store.round()?.confirming === true ||
      this.selectedIid() === null ||
      this.selectedIid() === this.activeIid(),
  );

  ngOnInit(): void {
    this.load({}, false);
  }

  protected submitSearch(): void {
    const text = this.searchForm.controls.search.value.trim();
    this.search = text === '' ? undefined : text;
    this.load(this.query(), false);
  }

  protected loadMore(): void {
    const page = this.nextPage();
    if (page === null) {
      return;
    }
    this.load({ ...this.query(), page }, true);
  }

  protected select(iid: number): void {
    this.selectedIid.set(iid);
  }

  protected release(): void {
    const iid = this.selectedIid();
    if (iid === null || this.releaseDisabled()) {
      return;
    }
    if (this.inLobby()) {
      this.selectIssue(iid);
      return;
    }
    this.dialog
      .open<SwitchIssueDialog, unknown, boolean>(SwitchIssueDialog)
      .afterClosed()
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => this.selectIssue(iid));
  }

  private selectIssue(issueIid: number): void {
    this.releasing.set(true);
    this.api.selectIssue(this.sessionId(), { issueIid }).subscribe({
      next: () => this.releasing.set(false),
      error: () => this.releasing.set(false),
    });
  }

  private query(): IssueQuery {
    return this.search === undefined ? {} : { search: this.search };
  }

  private load(query: IssueQuery, append: boolean): void {
    this.loading.set(true);
    this.api.listIssues(this.sessionId(), query).subscribe({
      next: (response) => {
        this.results.update((current) =>
          append ? [...current, ...response.items] : response.items,
        );
        this.nextPage.set(response.nextPage);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
