import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authInterceptor } from './auth.interceptor';
import { WEB_SOCKET_FACTORY, browserWebSocketFactory } from './web-socket-factory';

export function provideBackend(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    { provide: WEB_SOCKET_FACTORY, useValue: browserWebSocketFactory },
  ];
}
