import { Subject } from 'rxjs';
import { WebSocketFactory } from '../web-socket-factory';
import type { WsMessage, WsServerMessage } from '../ws-messages';

export class FakeSocket extends Subject<WsMessage> {
  readonly sent: WsMessage[] = [];

  constructor(readonly url: string) {
    super();
  }

  override next(message: WsMessage): void {
    this.sent.push(message);
  }

  receive(message: WsServerMessage): void {
    super.next(message);
  }

  drop(): void {
    this.error(new Error('connection lost'));
  }

  close(): void {
    this.complete();
  }
}

export class FakeSocketFactory {
  readonly sockets: FakeSocket[] = [];

  readonly create: WebSocketFactory = (url) => {
    const socket = new FakeSocket(url);
    this.sockets.push(socket);
    return socket;
  };

  last(): FakeSocket {
    const socket = this.sockets.at(-1);
    if (socket === undefined) {
      throw new Error('no socket was opened');
    }
    return socket;
  }
}
