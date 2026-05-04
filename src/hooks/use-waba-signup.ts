'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { wabaKeys } from './use-wabas';

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
        throw new Error(json?.message ?? 'Failed to hand off signup data');
      }

      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wabaKeys.all });
    },
  });
}
