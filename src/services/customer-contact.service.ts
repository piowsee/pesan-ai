import { logger } from '@/lib/server/logger';
import { ContactRepository } from '@/repositories/contact.repository';

export interface CustomerContact {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
}

export const CustomerContactService = {
  async getCustomerContacts(params: {
    userId: string;
    wabaIds?: string[]; // Internal DB WhatsappBusinessAccount.id values.
    phoneNumbers?: string[]; // Business/admin display phone numbers from the PhoneNumber table.
    page?: number;
    limit?: number;
  }): Promise<{
    customerContacts: CustomerContact[];
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

    const { customerContacts, total } =
      await ContactRepository.findConversationContacts({
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
      returned: customerContacts.length,
    });

    return {
      customerContacts,
      total,
    };
  },
};
