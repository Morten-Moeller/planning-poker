import type { SessionSocket, SocketFactory, SocketHandlers } from '../realtime';
import type { WsClientMessage, WsServerMessage } from '../ws-messages';

export interface FakeSocket extends SessionSocket {
  readonly url: string;
  readonly sent: WsClientMessage[];
  closed(): boolean;
  open(): void;
  receive(message: WsServerMessage): void;
  receiveText(data: string): void;
  drop(): void;
}

export interface FakeSocketFactory {
  readonly sockets: FakeSocket[];
  readonly create: SocketFactory;
  last(): FakeSocket;
}

function createFakeSocket(url: string, handlers: SocketHandlers): FakeSocket {
  const sent: WsClientMessage[] = [];
  let closed = false;
  return {
    url,
    sent,
    closed: () => closed,
    send: (data) => sent.push(JSON.parse(data) as WsClientMessage),
    close() {
      closed = true;
    },
    open: () => handlers.onOpen(),
    receive: (message) => handlers.onMessage(JSON.stringify(message)),
    receiveText: (data) => handlers.onMessage(data),
    drop: () => handlers.onClose(),
  };
}

export function createFakeSocketFactory(): FakeSocketFactory {
  const sockets: FakeSocket[] = [];
  return {
    sockets,
    create(url, handlers) {
      const socket = createFakeSocket(url, handlers);
      sockets.push(socket);
      return socket;
    },
    last() {
      const socket = sockets.at(-1);
      if (socket === undefined) {
        throw new Error('no socket was opened');
      }
      return socket;
    },
  };
}
