import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authInterceptor } from './auth.interceptor';
import { mockBackendInterceptor } from './mock/mock-backend.interceptor';
import { mockWebSocketFactory } from './mock/mock-web-socket';
import { WEB_SOCKET_FACTORY } from './web-socket-factory';

export function provideBackend(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(
      withInterceptors([authInterceptor, apiErrorInterceptor, mockBackendInterceptor]),
    ),
    { provide: WEB_SOCKET_FACTORY, useValue: mockWebSocketFactory },
  ];
}
