import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/server/prisma';

export interface CustomerPhoneNumberRow {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
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

    const customerContactQuery = prisma.conversation.findMany({
      where: conversationFilter,
      select: {
        contact: {
          select: {
            customerPhone: true,
            customerName: true,
            customerUsername: true,
          },
        },
      },
      distinct: ['contactId'],
      orderBy: [{ lastMessageAt: 'desc' }, { contactId: 'asc' }],
      ...pagination,
    });

    if (!pagination) {
      const conversations = await customerContactQuery;
      const customerPhoneNumbers = conversations.map(
        (conversation) => conversation.contact,
      );

      return {
        customerPhoneNumbers,
        total: customerPhoneNumbers.length,
      };
    }

    // Issue #143
    const [conversations, groupedContacts] = await Promise.all([
      customerContactQuery,
      prisma.conversation.groupBy({
        by: ['contactId'],
        where: conversationFilter,
      }),
    ]);

    return {
      customerPhoneNumbers: conversations.map(
        (conversation) => conversation.contact,
      ),
      total: groupedContacts.length,
    };
  },
};
