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

export interface WhatsAppBusinessProfileUpdateRequest {
  messaging_product: 'whatsapp';
  about?: string | null;
  address?: string | null;
  description?: string | null;
  email?: string | null;
  profile_picture_handle?: string | null;
  websites?: string[];
  vertical?: string | null;
}
