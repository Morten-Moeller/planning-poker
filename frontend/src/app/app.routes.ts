import { Routes } from '@angular/router';
import { sessionGuard } from './api/session.guard';
import { StartPage } from './start/start-page';

export const routes: Routes = [
  { path: '', component: StartPage },
  {
    path: 'session/:id/join',
    loadComponent: () => import('./join/join-page').then((m) => m.JoinPage),
  },
  {
    path: 'session/:id',
    loadComponent: () => import('./session/session-page').then((m) => m.SessionPage),
    canActivate: [sessionGuard],
  },
];
