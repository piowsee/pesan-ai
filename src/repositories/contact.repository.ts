import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/server/prisma';

export interface CustomerContactRow {
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

export const ContactRepository = {
  _buildPhoneNumberFilter(params: {
    userId: string;
    wabaIds?: string[];
    phoneNumbers?: string[];
  }): Prisma.PhoneNumberWhereInput {
    const { userId, wabaIds, phoneNumbers } = params;

    const wabaFilter: Prisma.WhatsappBusinessAccountWhereInput = {
      userId,
    };

    if (wabaIds && wabaIds.length > 0) {
      wabaFilter.id = { in: wabaIds };
    }

    const filter: Prisma.PhoneNumberWhereInput = {
      waba: wabaFilter,
    };

    if (phoneNumbers && phoneNumbers.length > 0) {
      filter.displayPhoneNumber = { in: phoneNumbers };
    }

    return filter;
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
    customerContacts: CustomerContactRow[];
    total: number;
  }> {
    const { userId, wabaIds, phoneNumbers, page, limit } = params;
    const phoneNumberFilter = this._buildPhoneNumberFilter({
      userId,
      wabaIds,
      phoneNumbers,
    });

    const contactFilter: Prisma.ContactWhereInput = {
      phoneNumber: phoneNumberFilter,
    };

    const pagination = this._buildPagination({ page, limit });

    const customerContactQuery = prisma.contact.findMany({
      where: contactFilter,
      select: {
        customerPhone: true,
        customerName: true,
        customerUsername: true,
      },
      orderBy: { updatedAt: 'desc' },
      ...pagination,
    });

    if (!pagination) {
      const customerContacts = await customerContactQuery;

      return {
        customerContacts,
        total: customerContacts.length,
      };
    }

    const [customerContacts, total] = await Promise.all([
      customerContactQuery,
      prisma.contact.count({
        where: contactFilter,
      }),
    ]);

    return {
      customerContacts,
      total,
    };
  },

  async upsertContact(
    params: {
      phoneNumberId: string;
      customerPhone?: string | null;
      bsuid?: string | null;
      customerName?: string | null;
      customerUsername?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    const { phoneNumberId } = params;
    const bsuid = params.bsuid?.trim() || undefined;
    const customerPhone = params.customerPhone?.trim() || undefined;
    const customerName = params.customerName?.trim() || undefined;
    const customerUsername = params.customerUsername?.trim() || undefined;

    if (!bsuid && !customerPhone) {
      throw new Error('Cannot upsert a contact without a phone or BSUID');
    }

    const data: Prisma.ContactUpdateInput = {
      phoneNumber: { connect: { id: phoneNumberId } },
    };
    if (bsuid) data.bsuid = bsuid;
    if (customerPhone) data.customerPhone = customerPhone;
    if (customerName !== undefined) data.customerName = customerName;
    if (customerUsername !== undefined)
      data.customerUsername = customerUsername;

    const existingContact =
      (bsuid
        ? await db.contact.findFirst({ where: { phoneNumberId, bsuid } })
        : null) ??
      (customerPhone
        ? await db.contact.findFirst({
            where: { phoneNumberId, customerPhone },
          })
        : null);

    if (existingContact) {
      return db.contact.update({
        where: { id: existingContact.id },
        data,
      });
    }

    const createData: Prisma.ContactCreateInput = {
      phoneNumber: { connect: { id: phoneNumberId } },
      ...(bsuid && { bsuid }),
      ...(customerPhone && { customerPhone }),
      ...(customerName !== undefined && { customerName }),
      ...(customerUsername !== undefined && { customerUsername }),
    };

    return db.contact.create({
      data: createData,
    });
  },

  async upsertContactsBulk(
    contacts: Array<{
      phoneNumberId: string;
      customerPhone?: string | null;
      bsuid?: string | null;
      customerName?: string | null;
      customerUsername?: string | null;
    }>,
  ) {
    return prisma.$transaction(
      async (tx) => {
        let processedCount = 0;
        for (const contact of contacts) {
          await this.upsertContact(contact, tx);
          processedCount++;
        }
        return processedCount;
      },
      {
        timeout: 60000,
        maxWait: 30000,
      },
    );
  },
};
