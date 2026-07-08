'use client';

import { Button } from '@/components/ui/button';
import { useEmbeddedSignupSession } from '@/hooks/use-embedded-signup-session';
import { useFacebookSdk } from '@/hooks/use-facebook-sdk';
import { WabaSignupError, useWabaSignup } from '@/hooks/use-waba-signup';
import { cn } from '@/lib/utils';
import { Link2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { toast } from 'sonner';

const FACEBOOK_CONFIG_ID = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID ?? '';

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
    featureType: string;
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
  // @see https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
  featureType: 'whatsapp_business_app_onboarding',
};

function useIsHttpsPage() {
  return useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== 'undefined' && window.location.protocol === 'https:',
    () => false,
  );
}

type WabaEmbeddedSignupButtonProps = ComponentProps<typeof Button> & {
  idleLabel?: string;
  pendingLabel?: string;
  onSuccess?: () => void;
};

export function WabaEmbeddedSignupButton({
  idleLabel = 'Login with Facebook',
  pendingLabel = 'Connecting...',
  onSuccess,
  className,
  disabled,
  ...props
}: WabaEmbeddedSignupButtonProps) {
  const sdkReady = useFacebookSdk();
  const isHttpsPage = useIsHttpsPage();
  const session = useEmbeddedSignupSession();
  const signupMutation = useWabaSignup();
  const t = useTranslations('Waba.signup');

  const [isLaunching, setIsLaunching] = useState(false);
  const [authorizationCode, setAuthorizationCode] = useState<string | null>(
    null,
  );

  const sessionRef = useRef(session);
  const handledCodeRef = useRef<string | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleFbLoginResponse = useCallback(
    (response: FacebookLoginResponse) => {
      setIsLaunching(false);

      const code = response.authResponse?.code;
      if (!code) {
        toast.error(t('noCodeError'));
        return;
      }

      handledCodeRef.current = null;
      setAuthorizationCode(code);

      if (!sessionRef.current?.wabaId) {
        toast.message(t('waitingDetails'));
      }
    },
    [t],
  );

  useEffect(() => {
    if (
      !authorizationCode ||
      !session?.wabaId ||
      !session.event?.startsWith('FINISH') ||
      signupMutation.isPending ||
      handledCodeRef.current === authorizationCode
    ) {
      return;
    }

    handledCodeRef.current = authorizationCode;
    const signupEvent = session.event;

    const submitData = async () => {
      try {
        const result = await signupMutation.mutateAsync({
          code: authorizationCode,
          event: signupEvent,
          wabaId: session.wabaId,
          sessionPayload: session.payload ?? null,
        });
        setAuthorizationCode(null);
        const message = result.data?.message;

        if (message) {
          toast.warning(message);
        } else {
          toast.success(t('success'));
        }
        onSuccess?.();
      } catch (error) {
        setAuthorizationCode(null);
        if (error instanceof WabaSignupError) {
          toast.warning(error.message || t('alreadyConnected'));
          return;
        }

        toast.error(error instanceof Error ? error.message : t('generalError'));
      }
    };

    void submitData();
  }, [authorizationCode, onSuccess, session, signupMutation, t]);

  const launchWhatsAppSignup = useCallback(() => {
    if (!isHttpsPage) {
      toast.error(t('requireHttps'));
      return;
    }

    if (!window.FB) {
      toast.error(t('sdkNotReady'));
      return;
    }

    setIsLaunching(true);
    window.FB.login(handleFbLoginResponse, {
      config_id: FACEBOOK_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: SIGNUP_EXTRAS,
    });
  }, [handleFbLoginResponse, isHttpsPage, t]);

  const isBusy = isLaunching || signupMutation.isPending;

  return (
    <Button
      type="button"
      disabled={disabled || !sdkReady || !isHttpsPage || isBusy}
      className={cn(className)}
      onClick={launchWhatsAppSignup}
      {...props}
    >
      {isBusy ? (
        <Loader2 className="animate-spin" data-icon="inline-start" />
      ) : (
        <Link2 data-icon="inline-start" />
      )}
      {isBusy ? pendingLabel : idleLabel}
    </Button>
  );
}
