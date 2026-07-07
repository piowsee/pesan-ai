import { z } from 'zod';

// --- Message content payloads ---

const TextMessageSchema = z.object({
  body: z.string(),
});

const WebhookMediaAssetSchema = z
  .object({
    caption: z.string().optional(),
    mime_type: z.string().optional(),
    sha256: z.string().optional(),
    id: z.string(),
    url: z.string(),
  })
  .passthrough();

const AudioMessageSchema = WebhookMediaAssetSchema.extend({
  voice: z.boolean().optional(),
});

const DocumentMessageSchema = WebhookMediaAssetSchema.extend({
  filename: z.string().optional(),
});

// --- Contact payloads ---

const ContactProfileSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
});

const ContactSchema = z.object({
  profile: ContactProfileSchema.optional(),
  wa_id: z.string().optional(),
  user_id: z.string().optional(),
});

// --- Message payloads ---

const BaseWebhookMessageSchema = z
  .object({
    id: z.string(),
    timestamp: z.string(), // Meta sends it as a string
    type: z.string(),
    text: TextMessageSchema.optional(),
    image: WebhookMediaAssetSchema.optional(),
    audio: AudioMessageSchema.optional(),
    video: WebhookMediaAssetSchema.optional(),
    document: DocumentMessageSchema.optional(),
  })
  .passthrough();

const WebhookMessageSchema = BaseWebhookMessageSchema.extend({
  from: z.string().optional(),
  from_user_id: z.string(),
});

// smb_message_echoes still doesn't support user_id - 05 July 2026
const WebhookMessageEchoSchema = BaseWebhookMessageSchema.extend({
  from: z.string(),
  to: z.string(),
});

// --- Status payloads ---

const WebhookStatusErrorSchema = z
  .object({
    code: z.number().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    error_data: z
      .object({
        details: z.string().optional(),
      })
      .passthrough()
      .optional(),
    href: z.string().optional(),
  })
  .passthrough();

const WebhookStatusConversationSchema = z
  .object({
    id: z.string().optional(),
    expiration_timestamp: z.string().optional(),
    origin: z
      .object({
        type: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const WebhookStatusPricingSchema = z
  .object({
    billable: z.boolean().optional(),
    pricing_model: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();

const WebhookStatusSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    timestamp: z.string().optional(),
    recipient_id: z.string().optional(),
    recipient_user_id: z.string().optional(),
    recipient_type: z.string().optional(),
    recipient_participant_id: z.string().optional(),
    recipient_identity_key_hash: z.string().optional(),
    biz_opaque_callback_data: z.string().optional(),
    conversation: WebhookStatusConversationSchema.optional(),
    pricing: WebhookStatusPricingSchema.optional(),
    errors: z.array(WebhookStatusErrorSchema).optional(),
  })
  .passthrough();

// --- Account update event names ---

const AccountUpdateEventSchema = z.enum([
  'ACCOUNT_DELETED',
  'ACCOUNT_OFFBOARDED',
  'ACCOUNT_RECONNECTED',
  'ACCOUNT_RESTRICTION',
  'ACCOUNT_VIOLATION',
  'AD_ACCOUNT_LINKED',
  'AUTH_INTL_PRICE_ELIGIBILITY_UPDATE',
  'BUSINESS_PRIMARY_LOCATION_COUNTRY_UPDATE',
  'DISABLED_UPDATE',
  'MM_LITE_TERMS_SIGNED',
  'PARTNER_ADDED',
  'PARTNER_APP_INSTALLED',
  'PARTNER_APP_UNINSTALLED',
  'PARTNER_CLIENT_CERTIFICATION_STATUS_UPDATE',
  'PARTNER_REMOVED',
  'VERIFIED_ACCOUNT',
  'VOLUME_BASED_PRICING_TIER_UPDATE',
]);

// --- Account update shared payloads ---

const WabaInfoSchema = z
  .object({
    waba_id: z.string().optional(),
    ad_account_linked: z.string().optional(),
    owner_business_id: z.string().optional(),
    partner_app_id: z.string().optional(),
    solution_id: z.string().optional(),
    solution_partner_business_ids: z.array(z.string()).optional(),
  })
  .passthrough();

// --- Account update policy and enforcement payloads ---

const ViolationInfoSchema = z
  .object({
    violation_type: z.string().optional(),
  })
  .passthrough();

const BanInfoSchema = z
  .object({
    waba_ban_state: z.string().optional(),
    waba_ban_date: z.string().optional(),
  })
  .passthrough();

const RestrictionInfoSchema = z
  .object({
    restriction_type: z.string().optional(),
    expiration: z.number().optional(),
    remediation: z.string().optional(),
  })
  .passthrough();

// --- Account update pricing and location payloads ---

const AuthInternationalRateExceptionCountrySchema = z
  .object({
    country_code: z.string().optional(),
    start_time: z.number().optional(),
  })
  .passthrough();

const AuthInternationalRateEligibilitySchema = z
  .object({
    exception_countries: z
      .array(AuthInternationalRateExceptionCountrySchema)
      .optional(),
    start_time: z.number().optional(),
  })
  .passthrough();

const VolumeTierInfoSchema = z
  .object({
    tier_update_time: z.number().optional(),
    pricing_category: z.string().optional(),
    tier: z.string().optional(),
    effective_month: z.string().optional(),
    region: z.string().optional(),
  })
  .passthrough();

// --- Account update partner payloads ---

const DisconnectionInfoSchema = z
  .object({
    reason: z.string().optional(),
    initiated_by: z.string().optional(),
  })
  .passthrough();

const PartnerClientCertificationInfoSchema = z
  .object({
    client_business_id: z.string().optional(),
    status: z.string().optional(),
    rejection_reasons: z.array(z.string()).optional(),
  })
  .passthrough();

// --- Account update value payload ---

const AccountUpdateValueSchema = z
  .object({
    event: AccountUpdateEventSchema,
    phone_number: z.string().optional(),
    country: z.string().optional(),
    waba_info: WabaInfoSchema.optional(),
    violation_info: ViolationInfoSchema.optional(),
    auth_international_rate_eligibility:
      AuthInternationalRateEligibilitySchema.optional(),
    ban_info: BanInfoSchema.optional(),
    volume_tier_info: VolumeTierInfoSchema.optional(),
    disconnection_info: DisconnectionInfoSchema.optional(),
    partner_client_certification_info:
      PartnerClientCertificationInfoSchema.optional(),
    restriction_info: z.array(RestrictionInfoSchema).optional(),
  })
  .passthrough();

// --- Webhook value payloads ---

const WebhookMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WebhookValueSchema = z
  .object({
    messaging_product: z.string(),
    metadata: WebhookMetadataSchema,
    contacts: z.array(ContactSchema).optional(),
    messages: z.array(WebhookMessageSchema).optional(),
    statuses: z.array(WebhookStatusSchema).optional(),
  })
  .passthrough();

const WebhookMessageEchoValueSchema = z
  .object({
    messaging_product: z.string(),
    metadata: WebhookMetadataSchema,
    message_echoes: z.array(WebhookMessageEchoSchema).optional(),
  })
  .passthrough();

// --- Webhook envelope ---

const WebhookChangeSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal('messages'),
    value: WebhookValueSchema,
  }),
  z.object({
    field: z.literal('smb_message_echoes'),
    value: WebhookMessageEchoValueSchema,
  }),
  z.object({
    field: z.literal('account_update'),
    value: AccountUpdateValueSchema,
  }),
]);

const WebhookEntrySchema = z
  .object({
    id: z.string(),
    time: z.number().optional(),
    changes: z.array(WebhookChangeSchema).optional(),
  })
  .passthrough();

export const MetaWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(WebhookEntrySchema).optional(),
});

// --- Exported types ---

export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
export type WebhookEntry = z.infer<typeof WebhookEntrySchema>;
export type WebhookValue = z.infer<typeof WebhookValueSchema>;
export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;
export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;
export type WebhookMessageEcho = z.infer<typeof WebhookMessageEchoSchema>;
export type WebhookMessageEchoValue = z.infer<
  typeof WebhookMessageEchoValueSchema
>;
export type AccountUpdateEvent = z.infer<typeof AccountUpdateEventSchema>;
export type AccountUpdateValue = z.infer<typeof AccountUpdateValueSchema>;
export type Contact = z.infer<typeof ContactSchema>;
