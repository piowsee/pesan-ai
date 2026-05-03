'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JsonRecord = Record<string, unknown>;

export type EmbeddedSignupSession = {
  eventType: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  payload: unknown;
  receivedAt: string;
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

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function findNestedString(
  value: unknown,
  acceptedKeys: Set<string>,
): string | null {
  if (typeof value === 'string' && value.trim()) {
    return null;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }

  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalized = normalizeKey(key);
      if (
        acceptedKeys.has(normalized) &&
        typeof nestedValue === 'string' &&
        nestedValue.trim()
      ) {
        return nestedValue;
      }
      if (nestedValue && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }

  return null;
}

function findEventType(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  for (const field of ['type', 'event', 'eventType']) {
    const v = record[field];
    if (typeof v === 'string' && v.trim()) return v;
  }

  return null;
}

function isRelevantPayload(
  payload: unknown,
  wabaId: string | null,
  phoneNumberId: string | null,
  eventType: string | null,
): boolean {
  const payloadText =
    typeof payload === 'string' ? payload.toLowerCase() : undefined;

  return (
    Boolean(wabaId || phoneNumberId) ||
    Boolean(eventType?.toLowerCase().includes('whatsapp')) ||
    Boolean(eventType?.toLowerCase().includes('signup')) ||
    Boolean(payloadText?.includes('whatsapp')) ||
    Boolean(payloadText?.includes('signup'))
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Listens for postMessage events from Facebook's embedded signup iframe and
 * parses the WABA ID, phone number ID, and event type out of the payload.
 */
export function useEmbeddedSignupSession() {
  const [session, setSession] = useState<EmbeddedSignupSession | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!TRUSTED_ORIGINS.has(event.origin)) return;

      const payload = parseMessageData(event.data);
      const eventType = findEventType(payload);
      const wabaId = findNestedString(
        payload,
        new Set([
          'wabaid',
          'wabid',
          'whatsappbusinessaccountid',
          'whatsappaccountid',
        ]),
      );
      const phoneNumberId = findNestedString(
        payload,
        new Set(['phonenumberid', 'phoneid', 'whatsappphonenumberid']),
      );

      if (!isRelevantPayload(payload, wabaId, phoneNumberId, eventType)) {
        return;
      }

      setSession({
        eventType,
        wabaId,
        phoneNumberId,
        payload,
        receivedAt: new Date().toISOString(),
      });

      if (wabaId || phoneNumberId) {
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
