import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideBackend } from './api/backend.providers';
import { loadRecentSessionsSetting } from './api/recent-sessions';
import { routes } from './app.routes';
import { ThemeService } from './shell/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    ...provideBackend(),
    provideAppInitializer(() => inject(ThemeService).start()),
    provideAppInitializer(loadRecentSessionsSetting),
  ],
};
