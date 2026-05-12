'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { wabaKeys } from './use-wabas';

// ─── Types ───────────────────────────────────────────────────────────

export interface CreatePhoneNumberParams {
  wabaId: string;
  phoneNumber: string;
  name: string;
  countryCode?: string;
}

export interface RequestCodeParams {
  phoneNumberId: string;
  wabaId: string;
  codeMethod?: 'SMS' | 'VOICE';
  language?: string;
}

export interface VerifyCodeParams {
  phoneNumberId: string;
  wabaId: string;
  code: string;
}

// ─── API Functions ───────────────────────────────────────────────────

async function createPhoneNumber(
  params: CreatePhoneNumberParams,
): Promise<{ phoneNumberId: string }> {
  const response = await fetch('/api/waba/phone-number/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMessage = body?.data?.message || body?.message;
    if (response.status === 502) {
      throw new Error(errorMessage || 'Meta API error');
    }
    throw new Error(errorMessage || 'Failed to create phone number');
  }

  const json = await response.json();
  return json.data;
}

async function requestCode(params: RequestCodeParams): Promise<void> {
  const response = await fetch('/api/waba/phone-number/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMessage = body?.data?.message || body?.message;
    if (response.status === 502) {
      throw new Error(errorMessage || 'Meta API error');
    }
    throw new Error(errorMessage || 'Failed to request verification code');
  }
}

async function verifyCode(params: VerifyCodeParams): Promise<void> {
  const response = await fetch('/api/waba/phone-number/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMessage = body?.data?.message || body?.message;
    if (response.status === 502) {
      throw new Error(errorMessage || 'Meta API error');
    }
    throw new Error(errorMessage || 'Failed to verify code');
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────

export function useCreatePhoneNumber() {
  return useMutation({
    mutationFn: createPhoneNumber,
  });
}

export function useRequestVerificationCode() {
  return useMutation({
    mutationFn: requestCode,
  });
}

export function useVerifyAndRegisterPhoneNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyCode,
    onSuccess: () => {
      // Invalidate the phone number fetch query on the WABA management page so the list refreshes
      queryClient.invalidateQueries({ queryKey: wabaKeys.all });
    },
  });
}
