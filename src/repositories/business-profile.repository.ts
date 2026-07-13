import prisma from '@/lib/server/prisma';
import { WhatsappBusinessProfile } from '@/types/waba';

export const BusinessProfileRepository = {
  async upsertBusinessProfile(params: {
    phoneNumberDbId: string;
    businessProfile: WhatsappBusinessProfile;
  }) {
    const { phoneNumberDbId, businessProfile } = params;
    return prisma.phoneNumber.update({
      where: { id: phoneNumberDbId },
      data: {
        businessProfile: {
          upsert: {
            create: {
              messagingProduct: businessProfile.messaging_product,
              address: businessProfile.address ?? null,
              description: businessProfile.description ?? null,
              vertical: businessProfile.vertical ?? null,
              about: businessProfile.about ?? null,
              email: businessProfile.email ?? null,
              websites: businessProfile.websites,
              profilePictureUrl: businessProfile.profile_picture_url ?? null,
            },
            update: {
              messagingProduct: businessProfile.messaging_product,
              address: businessProfile.address ?? null,
              description: businessProfile.description ?? null,
              vertical: businessProfile.vertical ?? null,
              about: businessProfile.about ?? null,
              email: businessProfile.email ?? null,
              websites: businessProfile.websites,
              profilePictureUrl: businessProfile.profile_picture_url ?? null,
            },
          },
        },
      },
    });
  },
};
