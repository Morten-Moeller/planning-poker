import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SessionStore } from '../api/session-store';
import { ShareSession } from './share-session';

@Component({
  selector: 'app-session-page',
  imports: [ShareSession],
  templateUrl: './session-page.html',
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
