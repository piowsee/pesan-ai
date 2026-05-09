'use client';

import { Button } from '@/components/ui/button';
import { useEmbeddedSignupSession } from '@/hooks/use-embedded-signup-session';
import { useFacebookSdk } from '@/hooks/use-facebook-sdk';
import { WabaSignupError, useWabaSignup } from '@/hooks/use-waba-signup';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
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
        toast.error(
          'Facebook login finished without an authorization code. Please try again.',
        );
        return;
      }

      handledCodeRef.current = null;
      setAuthorizationCode(code);

      if (!sessionRef.current?.wabaId) {
        toast.message(
          'Authorization code received. Waiting for WABA details from the embedded signup flow.',
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (
      !authorizationCode ||
      !session?.wabaId ||
      signupMutation.isPending ||
      handledCodeRef.current === authorizationCode
    ) {
      return;
    }

    handledCodeRef.current = authorizationCode;

    const submitData = async () => {
      try {
        await signupMutation.mutateAsync({
          code: authorizationCode,
          wabaId: session.wabaId,
          sessionPayload: session.payload ?? null,
        });
        setAuthorizationCode(null);
        toast.success('WABA connected successfully.');
        onSuccess?.();
      } catch (error) {
        setAuthorizationCode(null);
        if (error instanceof WabaSignupError && error.status === 409) {
          toast.warning(
            error.message ||
              'This WhatsApp Business Account is already connected to another user',
          );
          return;
        }

        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to send signup data to the backend',
        );
      }
    };

    void submitData();
  }, [authorizationCode, onSuccess, session, signupMutation]);

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
    window.FB.login(handleFbLoginResponse, {
      config_id: FACEBOOK_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: SIGNUP_EXTRAS,
    });
  }, [handleFbLoginResponse, isHttpsPage]);

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
      ) : null}
      {isBusy ? pendingLabel : idleLabel}
    </Button>
  );
}
