import { z } from 'zod';

export const AccountUpdateEventSchema = z.enum([
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

export const AccountUpdateValueSchema = z
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

export type AccountUpdateEvent = z.infer<typeof AccountUpdateEventSchema>;
export type AccountUpdateValue = z.infer<typeof AccountUpdateValueSchema>;
