import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/server/prisma';

export interface CustomerPhoneNumberRow {
  customerPhone: string;
  customerName: string | null;
}

interface FindConversationContactsParams {
  userId: string;
  wabaIds?: string[];
  phoneNumbers?: string[];
  page?: number;
  limit?: number;
}

export const CustomerPhoneNumberRepository = {
  _buildPhoneNumberFilter(params: {
    userId: string;
    wabaIds?: string[];
    phoneNumbers?: string[];
  }): Prisma.PhoneNumberWhereInput {
    const { userId, wabaIds, phoneNumbers } = params;

    return {
      waba: {
        userId,
        ...(wabaIds?.length ? { id: { in: wabaIds } } : {}),
      },
      ...(phoneNumbers?.length
        ? {
            displayPhoneNumber: {
              in: phoneNumbers,
            },
          }
        : {}),
    };
  },

  _buildConversationFilter(
    phoneNumberFilter: Prisma.PhoneNumberWhereInput,
  ): Prisma.ConversationWhereInput {
    return {
      phoneNumber: phoneNumberFilter,
    };
  },

  _buildPagination(params: {
    page?: number;
    limit?: number;
  }): Pick<Prisma.ConversationFindManyArgs, 'skip' | 'take'> | undefined {
    const { page, limit } = params;

    if (page === undefined || limit === undefined) {
      return undefined;
    }

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  },

  async findConversationContacts(
    params: FindConversationContactsParams,
  ): Promise<{
    customerPhoneNumbers: CustomerPhoneNumberRow[];
    total: number;
  }> {
    const { userId, wabaIds, phoneNumbers, page, limit } = params;
    const phoneNumberFilter = this._buildPhoneNumberFilter({
      userId,
      wabaIds,
      phoneNumbers,
    });
    const conversationFilter = this._buildConversationFilter(phoneNumberFilter);
    const pagination = this._buildPagination({ page, limit });

    const customerPhoneNumberQuery = prisma.conversation.findMany({
      where: conversationFilter,
      select: {
        customerPhone: true,
        customerName: true,
      },
      distinct: ['customerPhone'],
      orderBy: [{ lastMessageAt: 'desc' }, { customerPhone: 'asc' }],
      ...pagination,
    });

    if (!pagination) {
      const customerPhoneNumbers = await customerPhoneNumberQuery;

      return {
        customerPhoneNumbers,
        total: customerPhoneNumbers.length,
      };
    }

    // Issue #143
    const [customerPhoneNumbers, groupedContacts] = await Promise.all([
      customerPhoneNumberQuery,
      prisma.conversation.groupBy({
        by: ['customerPhone'],
        where: conversationFilter,
      }),
    ]);

    return {
      customerPhoneNumbers,
      total: groupedContacts.length,
    };
  },
};
