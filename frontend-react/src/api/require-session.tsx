import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router';
import { useBackend } from './backend';

function SessionAccess({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  const { tokens } = useBackend();
  const [allowed] = useState(() => tokens.identity(sessionId) !== null);

  return allowed ? children : <Navigate to={`/session/${sessionId}/join`} replace />;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { id = '' } = useParams();

  return (
    <SessionAccess key={id} sessionId={id}>
      {children}
    </SessionAccess>
  );
}
