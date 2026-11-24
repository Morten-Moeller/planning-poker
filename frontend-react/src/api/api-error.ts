import type { components } from './schema';

export type ErrorCode = components['schemas']['ErrorCode'];
export type ProblemDetail = components['schemas']['ProblemDetail'];

export class ApiError extends Error {
  readonly errorCode: string;
  readonly status: number | null;

  constructor(errorCode: string, status: number | null, detail = '') {
    super(detail);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.status = status;
  }

  get detail(): string {
    return this.message;
  }
}

export function isProblemDetail(body: unknown): body is ProblemDetail {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>)['errorCode'] === 'string'
  );
}
