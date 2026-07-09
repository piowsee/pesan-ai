import { ContactRepository } from '@/repositories/contact.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { SmbAppStateSyncWebhookHandler } from '@/services/meta-webhook-handler.service/smb-app-state-sync';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/prisma', () => ({
  default: {
    phoneNumber: {
      findUnique: vi.fn(),
    },
  },
}));

describe('SmbAppStateSyncWebhookHandler', () => {
  const metaWabaId = 'waba-123';
  const phoneNumberId = 'phone-123';

  it('processes add action contacts correctly', async () => {
    vi.mocked(PhoneNumberRepository.findPhoneNumberByMetaId).mockResolvedValue({
      id: 'internal-phone-id',
    } as never);

    const result = await SmbAppStateSyncWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        state_sync: [
          {
            type: 'contact',
            action: 'add',
            contact: { phone_number: '987', full_name: 'John Doe' },
          },
        ],
      },
    });

    expect(result).toBe(1);
    expect(ContactRepository.upsertContact).toHaveBeenCalledWith({
      customerPhone: '987',
      customerName: 'John Doe',
    });
  });

  it('processes remove action contacts correctly', async () => {
    vi.mocked(PhoneNumberRepository.findPhoneNumberByMetaId).mockResolvedValue({
      id: 'internal-phone-id',
    } as never);

    const result = await SmbAppStateSyncWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        state_sync: [
          {
            type: 'contact',
            action: 'remove',
            contact: { phone_number: '987' },
          },
        ],
      },
    });

    expect(result).toBe(1);
    expect(ContactRepository.upsertContact).toHaveBeenCalledWith({
      customerPhone: '987',
      customerName: null,
    });
  });

  it('handles empty state_sync array', async () => {
    const result = await SmbAppStateSyncWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        state_sync: [],
      },
    });

    expect(result).toBe(0);
    expect(ContactRepository.upsertContact).not.toHaveBeenCalled();
  });

  it('skips unknown phone numbers', async () => {
    vi.mocked(PhoneNumberRepository.findPhoneNumberByMetaId).mockResolvedValue(
      null,
    );

    const result = await SmbAppStateSyncWebhookHandler.processChange({
      metaWabaId,
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '123',
          phone_number_id: phoneNumberId,
        },
        state_sync: [
          {
            type: 'contact',
            action: 'add',
            contact: { phone_number: '987', full_name: 'John Doe' },
          },
        ],
      },
    });

    expect(result).toBe(0);
    expect(ContactRepository.upsertContact).not.toHaveBeenCalled();
  });
});
