import { Component, computed, input } from '@angular/core';
import { marked } from 'marked';
import type { components } from '../api/schema';

export type IssueView = components['schemas']['IssueView'];

@Component({
  selector: 'app-active-issue',
  templateUrl: './active-issue.html',
  styleUrl: './active-issue.scss',
})
export class ActiveIssue {
  readonly issue = input.required<IssueView>();

  protected readonly descriptionHtml = computed(() =>
    marked.parse(this.issue().description, { async: false }),
  );
}
