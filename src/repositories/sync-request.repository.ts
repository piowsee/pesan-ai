import prisma from '@/lib/server/prisma';

export const SyncRequestRepository = {
  async createSyncRequest(params: {
    requestId: string;
    syncType: string;
    phoneNumberId: string; // Internal DB PhoneNumber.id
  }) {
    const { requestId, syncType, phoneNumberId } = params;
    return prisma.syncRequest.create({
      data: {
        requestId,
        syncType,
        phoneNumberId,
        status: 'pending',
      },
    });
  },

  async updateSyncRequestStatus(params: {
    requestId: string;
    status: string;
    progress?: number;
  }) {
    const { requestId, status, progress } = params;
    return prisma.syncRequest.update({
      where: { requestId },
      data: {
        status,
        ...(progress !== undefined ? { progress } : {}),
      },
    });
  },

  async findByRequestId(params: { requestId: string }) {
    const { requestId } = params;
    return prisma.syncRequest.findUnique({
      where: { requestId },
    });
  },

  async findPendingByPhoneNumberId(params: { phoneNumberId: string }) {
    const { phoneNumberId } = params;
    return prisma.syncRequest.findMany({
      where: {
        phoneNumberId,
        status: 'pending',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
};
