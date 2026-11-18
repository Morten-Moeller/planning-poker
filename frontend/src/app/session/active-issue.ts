import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { marked } from 'marked';
import { SessionStore } from '../api/session-store';
import type { components } from '../api/schema';

export type IssueView = components['schemas']['IssueView'];

export const NARROW_LAYOUT = '(max-width: 719.98px)';

@Component({
  selector: 'app-active-issue',
  templateUrl: './active-issue.html',
  styleUrl: './active-issue.scss',
})
export class ActiveIssue {
  private readonly store = inject(SessionStore);

  readonly issue = input.required<IssueView>();

  private readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW_LAYOUT)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly descriptionHtml = computed(() =>
    marked.parse(this.issue().description, { async: false }),
  );

  private readonly expanded = linkedSignal({
    source: () => ({ iid: this.issue().iid, phase: this.store.phase() }),
    computation: () => false,
  });

  protected readonly collapsible = computed(
    () =>
      this.issue().description.trim() !== '' &&
      (this.store.phase() === 'REVEALED' || this.narrow()),
  );

  protected readonly collapsed = computed(() => this.collapsible() && !this.expanded());

  protected expand(): void {
    this.expanded.set(true);
  }

  protected collapse(): void {
    this.expanded.set(false);
  }
}
