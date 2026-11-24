import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createThemeStore } from '../../shell/theme-store';
import '../../styles/global.css';
import { UiGallery } from './ui-gallery';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('ui.html has no element with the id root');
}

const theme = createThemeStore(window);
theme.start();

createRoot(root).render(
  <StrictMode>
    <UiGallery theme={theme} />
  </StrictMode>,
);
