import type { components } from './schema';

export type WsAuth = components['schemas']['WebSocketAuth'];
export type WsPing = components['schemas']['WebSocketPing'];
export type WsPong = components['schemas']['WebSocketPong'];
export type WsSessionState = components['schemas']['WebSocketSessionState'];
export type WsRoundAllVoted = components['schemas']['WebSocketRoundAllVoted'];
export type WsError = components['schemas']['WebSocketError'];

export type WsClientMessage = WsAuth | WsPing;
export type WsServerMessage = WsSessionState | WsRoundAllVoted | WsError | WsPong;
