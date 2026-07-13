'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import type { JSendResponse } from '@/lib/api-helper/jsend';
import { type EmbeddedSignupSessionPayload } from '@/schemas/embedded-signup.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { wabaKeys } from './use-wabas';

const GENERIC_SIGNUP_ERROR_MESSAGE =
  'Failed to complete WhatsApp signup. Please try again.';

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
  sessionPayload: EmbeddedSignupSessionPayload;
}

type WabaSignupSuccessData = {
  phoneNumbers: Array<{ id: string }>;
  wabaDbId: string;
  wabaId: string;
};

/**
 * Hook to submit WhatsApp Embedded Signup data to the backend.
 * This includes the authorization code from Facebook and metadata
 * about the WABA and phone number identifiers.
 */
export function useWabaSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WabaSignupPayload) => {
      const response = await fetch('/api/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response
        .json()
        .catch(() => null)) as JSendResponse<WabaSignupSuccessData> | null;

      if (!response.ok || json?.status !== 'success') {
        const backendMessage = extractJSendErrorMessage(json);
        const message =
          (response.status === 502 || response.status === 409) && backendMessage
            ? backendMessage
            : GENERIC_SIGNUP_ERROR_MESSAGE;

        throw new WabaSignupError(message, response.status);
      }

      return json;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wabaKeys.all });
    },
  });
}
