import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { BackendProvider } from './api/backend';
import type { Backend } from './api/backend';
import { RequireSession } from './api/require-session';
import { AppShell } from './shell/app-shell';
import type { ThemeStore } from './shell/theme-store';
import { StartPage } from './start/start-page';

const SessionPage = lazy(() =>
  import('./session/session-page').then((module) => ({ default: module.SessionPage })),
);

const JoinPage = lazy(() =>
  import('./join/join-page').then((module) => ({ default: module.JoinPage })),
);

export function App({ backend, theme }: { backend: Backend; theme: ThemeStore }) {
  return (
    <BackendProvider backend={backend}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell theme={theme} />}>
            <Route index element={<StartPage />} />
            <Route
              path="session/:id"
              element={
                <RequireSession>
                  <Suspense fallback={null}>
                    <SessionPage />
                  </Suspense>
                </RequireSession>
              }
            />
            <Route
              path="session/:id/join"
              element={
                <Suspense fallback={null}>
                  <JoinPage />
                </Suspense>
              }
            />
            <Route path="*" element={null} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BackendProvider>
  );
}
