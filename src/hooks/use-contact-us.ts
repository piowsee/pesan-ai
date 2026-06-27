'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import type { JSendResponse } from '@/lib/api-helper/jsend';
import type { ContactUsPayload } from '@/schemas/contact-us.schema';
import { useMutation } from '@tanstack/react-query';

type ContactUsResponse = {
  message: string;
};

async function submitContactRequest(
  values: ContactUsPayload,
): Promise<ContactUsResponse> {
  const response = await fetch('/api/contact-us', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(values),
  });

  const body = (await response
    .json()
    .catch(() => null)) as JSendResponse<ContactUsResponse> | null;

  if (!response.ok || body?.status !== 'success' || !body.data) {
    throw new Error(
      extractJSendErrorMessage(body) ?? 'Failed to submit contact request',
    );
  }

  return body.data;
}

export function useContactUs() {
  return useMutation({
    mutationFn: submitContactRequest,
  });
}
