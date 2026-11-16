import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from './schema';

type Schemas = components['schemas'];
export type CreateSessionRequest = Schemas['CreateSessionRequest'];
export type CreateSessionResponse = Schemas['CreateSessionResponse'];
export type JoinSessionRequest = Schemas['JoinSessionRequest'];
export type JoinSessionResponse = Schemas['JoinSessionResponse'];
export type SessionView = Schemas['SessionView'];
export type IssueListResponse = Schemas['IssueListResponse'];
export type SelectIssueRequest = Schemas['SelectIssueRequest'];
export type VoteRequest = Schemas['VoteRequest'];
export type TimerRequest = Schemas['TimerRequest'];
export type ConfirmRequest = Schemas['ConfirmRequest'];

export interface IssueQuery {
  search?: string;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse> {
    return this.http.post<CreateSessionResponse>('/api/sessions', request);
  }

  joinSession(sessionId: string, request: JoinSessionRequest): Observable<JoinSessionResponse> {
    return this.http.post<JoinSessionResponse>(`${sessionPath(sessionId)}/participants`, request);
  }

  getSession(sessionId: string): Observable<SessionView> {
    return this.http.get<SessionView>(sessionPath(sessionId));
  }

  listIssues(sessionId: string, query: IssueQuery = {}): Observable<IssueListResponse> {
    let params = new HttpParams();
    if (query.search !== undefined) {
      params = params.set('search', query.search);
    }
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    return this.http.get<IssueListResponse>(`${sessionPath(sessionId)}/issues`, { params });
  }

  selectIssue(sessionId: string, request: SelectIssueRequest): Observable<void> {
    return this.http.post<void>(`${sessionPath(sessionId)}/active-issue`, request);
  }

  setTimer(sessionId: string, request: TimerRequest): Observable<void> {
    return this.http.put<void>(`${sessionPath(sessionId)}/timer`, request);
  }

  vote(sessionId: string, request: VoteRequest): Observable<void> {
    return this.http.put<void>(`${sessionPath(sessionId)}/vote`, request);
  }

  revealRound(sessionId: string): Observable<void> {
    return this.http.post<void>(`${sessionPath(sessionId)}/round/reveal`, null);
  }

  restartRound(sessionId: string): Observable<void> {
    return this.http.post<void>(`${sessionPath(sessionId)}/round/restart`, null);
  }

  confirmRound(sessionId: string, request: ConfirmRequest): Observable<void> {
    return this.http.post<void>(`${sessionPath(sessionId)}/round/confirm`, request);
  }
}

function sessionPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}`;
}
