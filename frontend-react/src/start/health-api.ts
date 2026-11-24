import type { components } from '../api/schema';

export type HealthStatus = components['schemas']['HealthStatus'];

export async function backendReachable(signal: AbortSignal): Promise<boolean> {
  const response = await fetch('/api/health', { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    return false;
  }
  const health = (await response.json()) as HealthStatus;
  return health.status === 'UP';
}
