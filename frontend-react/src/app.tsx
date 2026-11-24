import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from './shell/app-shell';
import type { ThemeStore } from './shell/theme-store';
import { StartPage } from './start/start-page';

export function App({ theme }: { theme: ThemeStore }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell theme={theme} />}>
          <Route index element={<StartPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
