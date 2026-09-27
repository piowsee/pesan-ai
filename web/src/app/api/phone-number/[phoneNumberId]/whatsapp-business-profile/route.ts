import { withApiAuth } from '@/lib/api-helper/api-handler';
import { ApiError } from '@/lib/api-helper/error';
import { jsend } from '@/lib/api-helper/jsend';
import { logger } from '@/lib/server/logger';
import { WhatsAppBusinessProfileUpdateSchema } from '@/schemas/whatsapp-business-profile.schema';
import { PhoneNumberService } from '@/services/phone-number.service';

/**
 * @route GET /api/phone-number/[phoneNumberId]/whatsapp-business-profile
 * @response { status: 'success', data: WhatsappBusinessProfile }
 * @access Authenticated users (must own the associated WABA)
 * @description Retrieves the WhatsApp Business Profile for the specified phone number. It will use cached database data unless it's older than 1 day, in which case it fetches fresh data from Meta.
 */
export const GET = withApiAuth<{ phoneNumberId: string }>(
  async ({ user, params }) => {
    const phoneNumberId = params.phoneNumberId;

    if (!phoneNumberId) {
      throw new ApiError('Phone number ID is required', 400);
    }

    logger.info('Handling GET WhatsApp Business Profile request', {
      userId: user.id,
      phoneNumberId,
    });

    const profile = await PhoneNumberService.getWhatsAppBusinessProfile({
      phoneNumberId,
      userId: user.id,
    });

    return jsend.success(profile);
  },
);

/**
 * @route POST /api/phone-number/[phoneNumberId]/whatsapp-business-profile
 * @body WhatsAppBusinessProfileUpdateRequest
 * @response { status: 'success', data: WhatsappBusinessProfile }
 * @access Authenticated users (must own the associated WABA)
 * @description Updates the WhatsApp Business Profile in Meta and synchronizes the local database.
 */
export const POST = withApiAuth<{ phoneNumberId: string }>(
  async ({ req, user, params }) => {
    const phoneNumberId = params.phoneNumberId;

    if (!phoneNumberId) {
      throw new ApiError('Phone number ID is required', 400);
    }

    const rawBody = await req.json();
    const parsedData = WhatsAppBusinessProfileUpdateSchema.parse(rawBody);

    logger.info('Handling POST WhatsApp Business Profile request', {
      userId: user.id,
      phoneNumberId,
    });

    const profile = await PhoneNumberService.updateWhatsAppBusinessProfile({
      phoneNumberId,
      userId: user.id,
      data: parsedData,
    });

    return jsend.success(profile);
  },
);
