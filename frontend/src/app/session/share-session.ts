import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

export type ShareTarget = 'link' | 'sessionId';

@Component({
  selector: 'app-share-session',
  imports: [MatButtonModule],
  templateUrl: './share-session.html',
  styleUrl: './share-session.scss',
})
export class ShareSession {
  private readonly document = inject(DOCUMENT);
  private readonly clipboard = this.document.defaultView?.navigator.clipboard ?? null;

  readonly sessionId = input.required<string>();

  protected readonly link = computed(
    () => `${this.document.location.origin}/session/${encodeURIComponent(this.sessionId())}/join`,
  );
  protected readonly canCopy = this.clipboard !== null;
  protected readonly copied = signal<ShareTarget | null>(null);
  protected readonly failed = signal<ShareTarget | null>(null);

  protected copy(target: ShareTarget): void {
    if (this.clipboard === null) {
      return;
    }
    const value = target === 'link' ? this.link() : this.sessionId();
    this.clipboard.writeText(value).then(
      () => {
        this.failed.set(null);
        this.copied.set(target);
      },
      () => {
        this.copied.set(null);
        this.failed.set(target);
      },
    );
  }
}
