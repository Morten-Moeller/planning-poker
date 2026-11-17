import { Subject, Subscription } from 'rxjs';
import { WebSocketFactory } from '../web-socket-factory';
import type { WsMessage } from '../ws-messages';
import { mockPhaseChanges, roleOfToken, snapshotFor } from './mock-session';

class MockSessionSocket extends Subject<WsMessage> {
  private phaseChanges: Subscription | null = null;

  override next(message: WsMessage): void {
    if (message.type === 'auth') {
      this.answerAuth(message.payload.token);
    }
    if (message.type === 'ping') {
      super.next({ type: 'pong' });
    }
  }

  private answerAuth(token: string): void {
    const role = roleOfToken(token);
    if (role === null) {
      super.next({
        type: 'error',
        payload: { errorCode: 'UNAUTHORIZED', detail: 'Unknown token.' },
      });
      this.complete();
      return;
    }
    super.next({ type: 'session.state', payload: snapshotFor(role) });
    this.phaseChanges?.unsubscribe();
    this.phaseChanges = mockPhaseChanges.subscribe(() =>
      super.next({ type: 'session.state', payload: snapshotFor(role) }),
    );
  }

  override complete(): void {
    this.phaseChanges?.unsubscribe();
    super.complete();
  }

  override unsubscribe(): void {
    this.phaseChanges?.unsubscribe();
    super.unsubscribe();
  }
}

export const mockWebSocketFactory: WebSocketFactory = () => new MockSessionSocket();
