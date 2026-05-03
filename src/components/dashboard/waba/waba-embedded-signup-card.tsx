'use client';

import { useEmbeddedSignupSession } from '@/hooks/use-embedded-signup-session';
import { useFacebookSdk } from '@/hooks/use-facebook-sdk';
import { useWabaSignup } from '@/hooks/use-waba-signup';
import Script from 'next/script';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { WabaSignupChecklist } from './waba-signup-checklist';
import { WabaSignupForm } from './waba-signup-form';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FACEBOOK_CONFIG_ID = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID ?? '';
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? '';

type FacebookLoginResponse = {
  authResponse?: { code?: string } | null;
  status?: string;
};

type FacebookLoginOptions = {
  config_id: string;
  response_type: 'code';
  override_default_response_type: boolean;
  extras: {
    version: string;
    setup: Record<string, unknown>;
  };
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: FacebookLoginOptions,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const SIGNUP_EXTRAS: FacebookLoginOptions['extras'] = {
  version: 'v4',
  setup: {
    business: {
      id: null,
      name: null,
      email: null,
      phone: { code: null, number: null },
      website: null,
      address: {
        streetAddress1: null,
        streetAddress2: null,
        city: null,
        state: null,
        zipPostal: null,
        country: null,
      },
      timezone: null,
    },
    phone: { displayName: null, category: null, description: null },
    preVerifiedPhone: { ids: null },
    solutionID: null,
    whatsAppBusinessAccount: { ids: null },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Orchestrates the WhatsApp Embedded Signup flow.
 *
 * Responsibilities:
 *   - Load the Facebook JS SDK (once per app lifetime via Next.js Script).
 *   - Detect whether the page is served over HTTPS.
 *   - Track the authorization code returned from Facebook Login.
 *   - Wire together <WabaSignupForm> and <WabaSignupChecklist>.
 */
export function WabaEmbeddedSignupCard() {
  const sdkReady = useFacebookSdk();
  const session = useEmbeddedSignupSession();
  const signupMutation = useWabaSignup();

  const [isLaunching, setIsLaunching] = useState(false);
  const [authorizationCode, setAuthorizationCode] = useState<string | null>(
    null,
  );
  // Detect HTTPS only on the client side.
  const isHttpsPage = useSyncExternalStore(
    () => () => {}, // protocol doesn't change during session
    () =>
      typeof window !== 'undefined' && window.location.protocol === 'https:',
    () => false, // server snapshot
  );

  const handleFbLoginResponse = useCallback(
    async (response: FacebookLoginResponse) => {
      setIsLaunching(false);

      const code = response.authResponse?.code;
      if (!code) {
        toast.error(
          'Facebook login finished without an authorization code. Please try again.',
        );
        return;
      }

      setAuthorizationCode(code);

      if (!session?.wabaId || !session?.phoneNumberId) {
        toast.message(
          'Authorization code received. Waiting for WABA and phone number IDs from the embedded signup event.',
        );
      }

      try {
        await signupMutation.mutateAsync({
          code,
          wabaId: session?.wabaId ?? null,
          phoneNumberId: session?.phoneNumberId ?? null,
          sessionPayload: session?.payload ?? null,
        });
        toast.success(
          'Facebook signup completed. The authorization code was sent to the backend.',
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to send signup data to the backend',
        );
      }
    },
    [session, signupMutation],
  );

  const launchWhatsAppSignup = useCallback(() => {
    if (!isHttpsPage) {
      toast.error(
        'Facebook Embedded Signup requires HTTPS. Open this page from an HTTPS URL before continuing.',
      );
      return;
    }

    if (!window.FB) {
      toast.error(
        'Facebook SDK is not ready yet. Please try again in a moment.',
      );
      return;
    }

    setIsLaunching(true);
    window.FB.login((response) => void handleFbLoginResponse(response), {
      config_id: FACEBOOK_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: SIGNUP_EXTRAS,
    });
  }, [handleFbLoginResponse, isHttpsPage]);

  const hasSessionIdentifiers = Boolean(
    session?.wabaId || session?.phoneNumberId,
  );

  return (
    <>
      {/*
       * The SDK script is loaded once per app lifetime by Next.js.
       * `useFacebookSdk` handles both the first-load (via fbAsyncInit) and
       * subsequent client-side navigations (via the window.FB guard on mount).
       */}
      <Script id="facebook-fb-init" strategy="afterInteractive">
        {`
          window.fbAsyncInit = function() {
            window.FB.init({
              appId            : '${META_APP_ID}',
              autoLogAppEvents : true,
              xfbml            : true,
              version          : 'v25.0'
            });
            // Custom event to notify our React hook
            window.dispatchEvent(new Event('fb-sdk-ready'));
          };
        `}
      </Script>
      <Script
        id="facebook-jssdk"
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        async
        defer
        crossOrigin="anonymous"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <WabaSignupForm
          sdkReady={sdkReady}
          isHttpsPage={isHttpsPage}
          isLaunching={isLaunching}
          isSubmitting={signupMutation.isPending}
          session={session}
          authorizationCode={authorizationCode}
          onLaunch={launchWhatsAppSignup}
        />

        <WabaSignupChecklist
          sdkReady={sdkReady}
          isHttpsPage={isHttpsPage}
          hasSessionIdentifiers={hasSessionIdentifiers}
          hasAuthorizationCode={Boolean(authorizationCode)}
          lastEventAt={session?.receivedAt}
        />
      </div>
    </>
  );
}
