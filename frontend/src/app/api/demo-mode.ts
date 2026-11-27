import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DemoMode {
  readonly active = signal(false);
}
