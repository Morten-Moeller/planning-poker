import type { components } from './schema';

export type ErrorCode = components['schemas']['ErrorCode'];
export type ProblemDetail = components['schemas']['ProblemDetail'];

export class ApiError extends Error {
  constructor(
    readonly errorCode: string,
    readonly status: number | null,
    detail = '',
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export function isProblemDetail(body: unknown): body is ProblemDetail {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>)['errorCode'] === 'string'
  );
}
