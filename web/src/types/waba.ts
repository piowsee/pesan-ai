export interface PhoneNumberMetaResponse {
  id: string;
  display_phone_number: string;
  verified_name?: string | null;
  code_verification_status?: string | null;
  quality_rating?: string | null; // GREEN, YELLOW, RED
  error?: { message: string };
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
