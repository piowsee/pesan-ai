import { logger } from '@/lib/server/logger';
import { CustomerPhoneNumberRepository } from '@/repositories/customer-phone-number.repository';

export interface CustomerPhoneNumberContact {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
}

export const CustomerPhoneNumberService = {
  async getCustomerPhoneNumbers(params: {
    userId: string;
    wabaIds?: string[]; // Internal DB WhatsappBusinessAccount.id values.
    phoneNumbers?: string[]; // Business/admin display phone numbers from the PhoneNumber table.
    page?: number;
    limit?: number;
  }): Promise<{
    customerPhoneNumbers: CustomerPhoneNumberContact[];
    total: number;
  }> {
    const { userId, wabaIds, phoneNumbers, page, limit } = params;

    logger.info('Fetching customer contacts', {
      userId,
      wabaIds,
      phoneNumbers,
      page,
      limit,
    });

    const { customerPhoneNumbers, total } =
      await CustomerPhoneNumberRepository.findConversationContacts({
        userId,
        wabaIds,
        phoneNumbers,
        page,
        limit,
      });

    logger.info('Customer contacts fetched successfully', {
      userId,
      wabaIds,
      phoneNumbers,
      total,
      returned: customerPhoneNumbers.length,
    });

    return {
      customerPhoneNumbers,
      total,
    };
  },
};
