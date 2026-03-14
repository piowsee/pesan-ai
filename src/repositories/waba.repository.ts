import prisma from '@/lib/prisma';

export const WabaRepository = {
  async findAllByUserId(userId: string) {
    return prisma.whatsappBusinessAccount.findMany({
      where: { userId },
      include: {
        phoneNumbers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
