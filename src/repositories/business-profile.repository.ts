import prisma from '@/lib/server/prisma';
import { WhatsappBusinessProfile } from '@/types/waba';

type UpsertBusinessProfileInput = {
  phoneNumberDbId: string;
  businessProfile: WhatsappBusinessProfile;
};

export const BusinessProfileRepository = {
  async upsertBusinessProfiles(businessProfiles: UpsertBusinessProfileInput[]) {
    return prisma.$transaction(async (tx) =>
      Promise.all(
        businessProfiles.map(({ phoneNumberDbId, businessProfile }) =>
          tx.phoneNumber.update({
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
                    profilePictureUrl:
                      businessProfile.profile_picture_url ?? null,
                  },
                  update: {
                    messagingProduct: businessProfile.messaging_product,
                    address: businessProfile.address ?? null,
                    description: businessProfile.description ?? null,
                    vertical: businessProfile.vertical ?? null,
                    about: businessProfile.about ?? null,
                    email: businessProfile.email ?? null,
                    websites: businessProfile.websites,
                    profilePictureUrl:
                      businessProfile.profile_picture_url ?? null,
                  },
                },
              },
            },
          }),
        ),
      ),
    );
  },
};
