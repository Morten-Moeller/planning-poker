import { useSyncExternalStore } from 'react';
import type { SessionView } from '../api/api';
import { useBackend } from '../api/backend';

export function useSession(): SessionView | null {
  const { sessions } = useBackend();
  return useSyncExternalStore(sessions.subscribe, sessions.session);
}
