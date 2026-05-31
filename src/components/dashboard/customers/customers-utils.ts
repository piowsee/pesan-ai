import { type CustomerPhoneNumber } from '@/hooks/use-phone-number';
import { type Waba } from '@/hooks/use-wabas';

export const PAGE_SIZE = 12;
export const EMPTY_CUSTOMERS: CustomerPhoneNumber[] = [];
export const EMPTY_WABAS: Waba[] = [];

export type PhoneFilterOption = {
  id: string;
  wabaId: string;
  displayPhoneNumber: string;
  wabaLabel: string;
};

export function getWabaLabel(waba: Waba) {
  return waba.businessName?.trim() || waba.wabaId;
}

export function getCustomerName(customer: CustomerPhoneNumber) {
  return customer.customerName?.trim() || 'Unnamed customer';
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function getChatLink(phoneNumber: string) {
  return `wa.me/${normalizePhone(phoneNumber)}`;
}

export function selectionLabel(params: {
  total: number;
  selectedCount: number;
  allLabel: string;
  emptyLabel: string;
  singularLabel: string;
  pluralLabel: string;
}) {
  const {
    total,
    selectedCount,
    allLabel,
    emptyLabel,
    singularLabel,
    pluralLabel,
  } = params;

  if (total === 0 || selectedCount === 0) {
    return emptyLabel;
  }

  if (selectedCount === total) {
    return allLabel;
  }

  if (selectedCount === 1) {
    return `1 ${singularLabel}`;
  }

  return `${selectedCount} ${pluralLabel}`;
}
