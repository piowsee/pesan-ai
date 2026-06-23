'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import type { JSendResponse } from '@/lib/api-helper/jsend';
import type { RequestAccountPayload } from '@/schemas/request-account.schema';
import { useMutation } from '@tanstack/react-query';

type RequestAccountResponse = {
  message: string;
};

async function submitAccountRequest(
  values: RequestAccountPayload,
): Promise<RequestAccountResponse> {
  const response = await fetch('/api/request-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(values),
  });

  const body = (await response
    .json()
    .catch(() => null)) as JSendResponse<RequestAccountResponse> | null;

  if (!response.ok || body?.status !== 'success' || !body.data) {
    throw new Error(
      extractJSendErrorMessage(body) ?? 'Failed to submit account request',
    );
  }

  return body.data;
}

export function useRequestAccount() {
  return useMutation({
    mutationFn: submitAccountRequest,
  });
}
