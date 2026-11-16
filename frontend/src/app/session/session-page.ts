import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SessionStore } from '../api/session-store';
import { ActiveIssue } from './active-issue';
import { CardDeck } from './card-deck';
import { IssuePanel } from './issue-panel';
import { ParticipantList } from './participant-list';
import { RoundResult } from './round-result';
import { RoundStatus } from './round-status';
import { SessionHistory } from './session-history';
import { ShareSession } from './share-session';

@Component({
  selector: 'app-session-page',
  imports: [
    ShareSession,
    ParticipantList,
    IssuePanel,
    ActiveIssue,
    RoundStatus,
    CardDeck,
    RoundResult,
    SessionHistory,
  ],
  templateUrl: './session-page.html',
  styleUrl: './session-page.scss',
})
export class SessionPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(SessionStore);

  ngOnInit(): void {
    this.store.enter(this.route.snapshot.paramMap.get('id') ?? '');
  }

  ngOnDestroy(): void {
    this.store.leave();
  }
}
