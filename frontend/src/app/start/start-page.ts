import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { HealthApi } from './health-api';

@Component({
  selector: 'app-start-page',
  templateUrl: './start-page.html',
})
export class StartPage {
  private readonly healthApi = inject(HealthApi);

  protected readonly backendReachable = toSignal(
    this.healthApi.status().pipe(
      map((health) => health.status === 'UP'),
      catchError(() => of(false)),
    ),
    { initialValue: undefined },
  );
}
