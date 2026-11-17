import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ErrorState } from '../api/error-state';
import { SessionStore } from '../api/session-store';
import { TokenStore } from '../api/token-store';
import { ActiveIssue } from './active-issue';
import { CardDeck } from './card-deck';
import { LOBBY_MOTIF, motifFor } from './card-motif';
import { IssuePanel } from './issue-panel';
import { LastResult, lastConfirmed } from './last-result';
import { ParticipantList } from './participant-list';
import { RoundResult } from './round-result';
import { RoundStatus } from './round-status';
import { RoundTimer } from './round-timer';
import { SessionFacts } from './session-facts';
import { SessionHistory } from './session-history';
import { ShareSession } from './share-session';
import { TimerSetting } from './timer-setting';

@Component({
  selector: 'app-session-page',
  imports: [
    RouterLink,
    ShareSession,
    ParticipantList,
    IssuePanel,
    TimerSetting,
    ActiveIssue,
    RoundTimer,
    RoundStatus,
    CardDeck,
    RoundResult,
    SessionHistory,
    SessionFacts,
    LastResult,
  ],
  templateUrl: './session-page.html',
  styleUrl: './session-page.scss',
})
export class SessionPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly tokens = inject(TokenStore);
  private readonly errorState = inject(ErrorState);
  protected readonly store = inject(SessionStore);
  protected readonly gone = signal(false);
  private readonly sessionId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly motif = computed(() => {
    const session = this.store.session();
    if (
      session === null ||
      session.phase === 'LOBBY' ||
      session.activeIssue === null ||
      session.round === null
    ) {
      return LOBBY_MOTIF;
    }
    return motifFor(session.sessionId, session.activeIssue.iid, session.round.number);
  });
  protected readonly afterResult = computed(() => lastConfirmed(this.store.session()) !== null);

  constructor() {
    effect(() => {
      if (this.errorState.error()?.errorCode === 'SESSION_NOT_FOUND') {
        this.errorState.clear();
        this.tokens.remove(this.sessionId);
        this.store.leave();
        this.gone.set(true);
      }
    });
  }

  ngOnInit(): void {
    this.store.enter(this.sessionId);
  }

  ngOnDestroy(): void {
    this.store.leave();
  }
}
