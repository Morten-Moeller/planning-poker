import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBackend } from './api/backend';
import { App } from './app';
import { createThemeStore } from './shell/theme-store';
import './styles/global.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('index.html has no element with the id root');
}

const backend = createBackend(window);
const theme = createThemeStore(window, backend.preferences);
theme.start();

await backend.loadSetting();

createRoot(root).render(
  <StrictMode>
    <App backend={backend} theme={theme} />
  </StrictMode>,
);
