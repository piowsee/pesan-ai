import { logger } from '@/lib/server/logger';
import { CustomerPhoneNumberRepository } from '@/repositories/customer-phone-number.repository';

export interface CustomerPhoneNumberContact {
  customerPhone: string;
  customerName: string | null;
}

export const CustomerPhoneNumberService = {
  async getCustomerPhoneNumbers(params: {
    userId: string;
    wabaIds?: string[]; // Internal DB WhatsappBusinessAccount.id values.
    phoneNumbers?: string[]; // Display/customer phone number strings.
    page?: number;
    limit?: number;
  }): Promise<{
    customerPhoneNumbers: CustomerPhoneNumberContact[];
    total: number;
  }> {
    const { userId, wabaIds, phoneNumbers, page, limit } = params;

    logger.info('Fetching customer phone numbers', {
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

    logger.info('Customer phone numbers fetched successfully', {
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
