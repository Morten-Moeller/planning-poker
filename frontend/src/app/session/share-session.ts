import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { SessionView } from '../api/api.service';

export type ShareTarget = 'developer' | 'viewer';
export type SessionInvites = NonNullable<SessionView['invites']>;

const COPIED_VISIBLE_MS = 3000;

@Component({
  selector: 'app-share-session',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './share-session.html',
  styleUrl: './share-session.scss',
})
export class ShareSession {
  private readonly document = inject(DOCUMENT);
  private readonly clipboard = this.document.defaultView?.navigator.clipboard ?? null;

  readonly sessionId = input.required<string>();
  readonly invites = input.required<SessionInvites>();

  protected readonly links = computed((): Record<ShareTarget, string> => {
    const base = `${this.document.location.origin}/session/${encodeURIComponent(this.sessionId())}/join`;
    const invites = this.invites();
    return {
      developer: `${base}?invite=${encodeURIComponent(invites.developer)}`,
      viewer: `${base}?invite=${encodeURIComponent(invites.viewer)}&as=viewer`,
    };
  });
  protected readonly canCopy = this.clipboard !== null;
  protected readonly copied = signal<ShareTarget | null>(null);
  protected readonly failed = signal<ShareTarget | null>(null);

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopCopiedTimer());
  }

  protected copy(target: ShareTarget): void {
    if (this.clipboard === null) {
      return;
    }
    this.clipboard.writeText(this.links()[target]).then(
      () => {
        this.failed.set(null);
        this.copied.set(target);
        this.stopCopiedTimer();
        this.copiedTimer = setTimeout(() => {
          this.copiedTimer = null;
          this.copied.set(null);
        }, COPIED_VISIBLE_MS);
      },
      () => {
        this.stopCopiedTimer();
        this.copied.set(null);
        this.failed.set(target);
      },
    );
  }

  private stopCopiedTimer(): void {
    if (this.copiedTimer !== null) {
      clearTimeout(this.copiedTimer);
      this.copiedTimer = null;
    }
  }
}
