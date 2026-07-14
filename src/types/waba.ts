export interface PhoneNumberMetaResponse {
  id: string;
  display_phone_number: string;
  verified_name?: string | null;
  code_verification_status?: string | null;
  quality_rating?: string | null; // GREEN, YELLOW, RED
  error?: { message: string };
}

export interface WhatsappBusinessProfile {
  messaging_product: 'whatsapp';
  address?: string | null;
  description?: string | null;
  vertical?: string | null;
  about?: string | null;
  email?: string | null;
  websites: string[];
  profile_picture_url?: string | null;
}

export interface WhatsappBusinessProfileMetaResponse {
  data?: Array<{
    business_profile?: WhatsappBusinessProfile | null;
  }>;
}

export interface WabaMetaResponse {
  id?: string;
  name?: string;
  timezone_id?: string;
  message_template_namespace?: string;
  error?: { message: string };
}

export interface TokenExchangeResponse {
  access_token: string;
  token_type?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

export type WabaDetails = {
  name: string | null;
};
