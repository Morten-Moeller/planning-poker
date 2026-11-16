import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../api/schema';

export type HealthStatus = components['schemas']['HealthStatus'];

@Injectable({ providedIn: 'root' })
export class HealthApi {
  private readonly http = inject(HttpClient);

  status(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>('/api/health');
  }
}
