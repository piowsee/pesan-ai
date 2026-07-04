import { CustomerPhoneNumberRepository } from '@/repositories/customer-phone-number.repository';
import { CustomerPhoneNumberService } from '@/services/customer-phone-number.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/customer-phone-number.service');

describe('CustomerPhoneNumberService', { tags: ['backend'] }, () => {
  const USER_ID = 'user-123';
  const DISPLAY_PHONE_NUMBER = '+6281234567890';

  beforeEach(() => {
    vi.mocked(
      CustomerPhoneNumberRepository.findConversationContacts,
    ).mockResolvedValue({
      customerPhoneNumbers: [],
      total: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCustomerPhoneNumbers', () => {
    it('passes multi-value filters through to the repository', async () => {
      vi.mocked(
        CustomerPhoneNumberRepository.findConversationContacts,
      ).mockResolvedValue({
        customerPhoneNumbers: [
          {
            customerPhone: '628111',
            customerName: 'Alice',
            customerUsername: '@alice',
          },
          {
            customerPhone: '628222',
            customerName: null,
            customerUsername: null,
          },
        ],
        total: 2,
      });

      const result = await CustomerPhoneNumberService.getCustomerPhoneNumbers({
        userId: USER_ID,
        wabaIds: ['db-waba-123', 'db-waba-456'],
        phoneNumbers: [DISPLAY_PHONE_NUMBER, '+6289999999999'],
      });

      expect(
        CustomerPhoneNumberRepository.findConversationContacts,
      ).toHaveBeenCalledWith({
        userId: USER_ID,
        wabaIds: ['db-waba-123', 'db-waba-456'],
        phoneNumbers: [DISPLAY_PHONE_NUMBER, '+6289999999999'],
        page: undefined,
        limit: undefined,
      });
      expect(result).toEqual({
        customerPhoneNumbers: [
          {
            customerPhone: '628111',
            customerName: 'Alice',
            customerUsername: '@alice',
          },
          {
            customerPhone: '628222',
            customerName: null,
            customerUsername: null,
          },
        ],
        total: 2,
      });
    });

    it('paginates after deduplicating customer phone numbers', async () => {
      vi.mocked(
        CustomerPhoneNumberRepository.findConversationContacts,
      ).mockResolvedValue({
        customerPhoneNumbers: [
          {
            customerPhone: '628222',
            customerName: 'Bob',
            customerUsername: null,
          },
        ],
        total: 3,
      });

      const result = await CustomerPhoneNumberService.getCustomerPhoneNumbers({
        userId: USER_ID,
        page: 2,
        limit: 1,
      });

      expect(
        CustomerPhoneNumberRepository.findConversationContacts,
      ).toHaveBeenCalledWith({
        userId: USER_ID,
        wabaIds: undefined,
        phoneNumbers: undefined,
        page: 2,
        limit: 1,
      });
      expect(result).toEqual({
        customerPhoneNumbers: [
          {
            customerPhone: '628222',
            customerName: 'Bob',
            customerUsername: null,
          },
        ],
        total: 3,
      });
    });
  });
});
