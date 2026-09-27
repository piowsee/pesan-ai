'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmbeddedSignupSession = {
  type?: string;
  event?: string | null;
  data?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRUSTED_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
]);

// ---------------------------------------------------------------------------
// Message-parsing helpers
// ---------------------------------------------------------------------------

function parseMessageData(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Listens for postMessage events from Facebook's embedded signup iframe.
 */
export function useEmbeddedSignupSession() {
  const [session, setSession] = useState<EmbeddedSignupSession | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!TRUSTED_ORIGINS.has(event.origin)) return;

      const payload = parseMessageData(event.data) as EmbeddedSignupSession;

      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') {
        return;
      }

      setSession(payload);

      if (payload.event === 'CANCEL' || payload.event === 'ERROR') {
        const errorMessage = payload.data?.error_message as string | undefined;
        toast.error(errorMessage || 'Embedded signup was cancelled.');
      } else if (payload.event?.startsWith('FINISH')) {
        toast.success('Embedded signup session info received.');
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return session;
}
