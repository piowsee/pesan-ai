import { logger } from '@/lib/server/logger';
import type { AccountUpdateValue } from '@/schemas/meta-webhook-handler.schema/account-update';

import { handleAccountOffboarded } from './account-offboarded';
import { handleAccountReconnected } from './account-reconnected';

export const AccountUpdateWebhookHandler = {
  async processChange(params: {
    metaWabaId: string;
    eventTime?: number;
    value: AccountUpdateValue;
  }) {
    const { metaWabaId, eventTime, value } = params;

    switch (value.event) {
      case 'ACCOUNT_OFFBOARDED':
        return handleAccountOffboarded({ metaWabaId, eventTime, value });

      case 'ACCOUNT_RECONNECTED':
        return handleAccountReconnected({ metaWabaId, eventTime, value });

      case 'ACCOUNT_DELETED':
        // TODO: Mark or remove the local WABA when Meta reports deletion.
        return logUnimplementedAccountUpdateEvent(params);

      case 'ACCOUNT_RESTRICTION':
        // TODO: Persist restriction_info and surface restricted capabilities to users.
        return logUnimplementedAccountUpdateEvent(params);

      case 'ACCOUNT_VIOLATION':
        // TODO: Persist violation_info and notify the account owner.
        return logUnimplementedAccountUpdateEvent(params);

      case 'AD_ACCOUNT_LINKED':
        // TODO: Persist linked ad account metadata from waba_info.
        return logUnimplementedAccountUpdateEvent(params);

      case 'AUTH_INTL_PRICE_ELIGIBILITY_UPDATE':
        // TODO: Persist auth international rate eligibility and exception countries.
        return logUnimplementedAccountUpdateEvent(params);

      case 'BUSINESS_PRIMARY_LOCATION_COUNTRY_UPDATE':
        // TODO: Persist the WABA primary business country.
        return logUnimplementedAccountUpdateEvent(params);

      case 'DISABLED_UPDATE':
        // TODO: Persist ban_info and update WABA availability based on ban state.
        return logUnimplementedAccountUpdateEvent(params);

      case 'MM_LITE_TERMS_SIGNED':
        // TODO: Persist MM API for WhatsApp terms acceptance metadata.
        return logUnimplementedAccountUpdateEvent(params);

      case 'PARTNER_ADDED':
        // TODO: Persist partner relationship metadata from waba_info.
        return logUnimplementedAccountUpdateEvent(params);

      case 'PARTNER_APP_INSTALLED':
        // TODO: Persist granted partner app permissions and solution metadata.
        return logUnimplementedAccountUpdateEvent(params);

      case 'PARTNER_APP_UNINSTALLED':
        // TODO: Persist revoked partner app permissions and adjust feature access.
        return logUnimplementedAccountUpdateEvent(params);

      case 'PARTNER_CLIENT_CERTIFICATION_STATUS_UPDATE':
        // TODO: Persist partner-led business verification status and rejection reasons.
        return logUnimplementedAccountUpdateEvent(params);

      case 'PARTNER_REMOVED':
        // TODO: Persist partner removal and disconnection_info when present.
        return logUnimplementedAccountUpdateEvent(params);

      case 'VERIFIED_ACCOUNT':
        // TODO: Persist phone-level verified account updates when Meta sends this legacy sample event.
        return logUnimplementedAccountUpdateEvent(params);

      case 'VOLUME_BASED_PRICING_TIER_UPDATE':
        // TODO: Persist volume_tier_info for WABA pricing tier changes.
        return logUnimplementedAccountUpdateEvent(params);
    }
  },
};

function logUnimplementedAccountUpdateEvent(params: {
  metaWabaId: string;
  eventTime?: number;
  value: AccountUpdateValue;
}) {
  logger.info('Account update webhook event received but not implemented yet', {
    metaWabaId: params.metaWabaId,
    eventTime: params.eventTime,
    event: params.value.event,
  });

  return 0;
}
