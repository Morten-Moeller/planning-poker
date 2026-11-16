import { InjectionToken } from '@angular/core';
import { Subject } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import type { WsMessage } from './ws-messages';

export type WebSocketFactory = (url: string) => Subject<WsMessage>;

export const WEB_SOCKET_FACTORY = new InjectionToken<WebSocketFactory>('WEB_SOCKET_FACTORY');

export const browserWebSocketFactory: WebSocketFactory = (url) => webSocket<WsMessage>(url);

export function sessionSocketUrl(location: Location, sessionId: string): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/ws/sessions/${encodeURIComponent(sessionId)}`;
}
