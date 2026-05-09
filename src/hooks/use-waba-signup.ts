'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { wabaKeys } from './use-wabas';

export class WabaSignupError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'WabaSignupError';
    this.status = status;
  }
}

export interface WabaSignupPayload {
  code: string;
  wabaId: string | null;
  sessionPayload: unknown;
}

/**
 * Hook to submit WhatsApp Embedded Signup data to the backend.
 * This includes the authorization code from Facebook and metadata
 * about the WABA and phone number identifiers.
 */
export function useWabaSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WabaSignupPayload) => {
      const response = await fetch('/api/waba/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || json?.status !== 'success') {
        const message =
          json?.message ??
          json?.data?.message ??
          'Failed to hand off signup data';

        throw new WabaSignupError(message, response.status);
      }

      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wabaKeys.all });
    },
  });
}
