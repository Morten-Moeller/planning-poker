import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createThemeStore } from './shell/theme-store';
import './styles/global.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('index.html has no element with the id root');
}

const theme = createThemeStore(window);
theme.start();

createRoot(root).render(
  <StrictMode>
    <App theme={theme} />
  </StrictMode>,
);
