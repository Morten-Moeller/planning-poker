import { Injectable, signal } from '@angular/core';
import { ApiError } from './api-error';

@Injectable({ providedIn: 'root' })
export class ErrorState {
  private readonly last = signal<ApiError | null>(null);

  readonly error = this.last.asReadonly();

  report(error: ApiError): void {
    this.last.set(error);
  }

  clear(): void {
    this.last.set(null);
  }
}
