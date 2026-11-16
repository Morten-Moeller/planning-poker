import { Routes } from '@angular/router';
import { sessionGuard } from './api/session.guard';
import { JoinPage } from './join/join-page';
import { SessionPage } from './session/session-page';
import { StartPage } from './start/start-page';

export const routes: Routes = [
  { path: '', component: StartPage },
  { path: 'session/:id/join', component: JoinPage },
  { path: 'session/:id', component: SessionPage, canActivate: [sessionGuard] },
];
