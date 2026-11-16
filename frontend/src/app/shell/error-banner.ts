import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { errorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';

@Component({
  selector: 'app-error-banner',
  imports: [MatButtonModule],
  templateUrl: './error-banner.html',
  styleUrl: './error-banner.scss',
})
export class ErrorBanner {
  private readonly errorState = inject(ErrorState);

  protected readonly message = computed(() => {
    const error = this.errorState.error();
    return error === null ? null : errorMessage(error.errorCode);
  });

  protected close(): void {
    this.errorState.clear();
  }
}
