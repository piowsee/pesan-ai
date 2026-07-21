import { ConnectPhoneNumberService } from './connect-phone-number';
import { WhatsappBusinessProfileService } from './whatsapp-business-profile';

export const PhoneNumberService = {
  ...ConnectPhoneNumberService,
  ...WhatsappBusinessProfileService,
};
