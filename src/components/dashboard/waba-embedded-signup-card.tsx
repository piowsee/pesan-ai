'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Layers, Loader2, ShieldCheck } from 'lucide-react';
import Script from 'next/script';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type JsonRecord = Record<string, unknown>;

type EmbeddedSignupSession = {
  eventType: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  payload: unknown;
  receivedAt: string;
};

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  } | null;
  status?: string;
};

type FacebookLoginOptions = {
  config_id: string;
  response_type: 'code';
  override_default_response_type: boolean;
  extras: {
    version: string;
    setup: JsonRecord;
  };
};

type FacebookSdk = {
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

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const FACEBOOK_APP_ID = '2397882664066171';
const FACEBOOK_CONFIG_ID = '832352623231466';
const FACEBOOK_SDK_VERSION = 'v25.0';
const TRUSTED_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
]);

const SIGNUP_EXTRAS = {
  version: 'v4',
  setup: {
    business: {
      id: null,
      name: null,
      email: null,
      phone: {
        code: null,
        number: null,
      },
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
    phone: {
      displayName: null,
      category: null,
      description: null,
    },
    preVerifiedPhone: {
      ids: null,
    },
    solutionID: null,
    whatsAppBusinessAccount: {
      ids: null,
    },
  },
} satisfies FacebookLoginOptions['extras'];

function parseMessageData(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function findNestedString(
  value: unknown,
  acceptedKeys: Set<string>,
): string | null {
  if (typeof value === 'string' && value.trim()) {
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalized = normalizeKey(key);
      if (
        acceptedKeys.has(normalized) &&
        typeof nestedValue === 'string' &&
        nestedValue.trim()
      ) {
        return nestedValue;
      }

      if (nestedValue && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }

  return null;
}

function findEventType(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const typeFields = ['type', 'event', 'eventType'];

  for (const field of typeFields) {
    const fieldValue = payloadRecord[field];
    if (typeof fieldValue === 'string' && fieldValue.trim()) {
      return fieldValue;
    }
  }

  return null;
}

export function WabaEmbeddedSignupCard() {
  const [sdkReady, setSdkReady] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<EmbeddedSignupSession | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<string | null>(
    null,
  );
  const [isHttpsPage, setIsHttpsPage] = useState(false);

  const hasSessionIdentifiers = Boolean(
    session?.wabaId || session?.phoneNumberId,
  );

  const sessionSummary = useMemo(
    () => [
      {
        label: 'WABA ID',
        value: session?.wabaId ?? 'Waiting for signup flow',
      },
      {
        label: 'Phone Number ID',
        value: session?.phoneNumberId ?? 'Waiting for signup flow',
      },
      {
        label: 'Last Event',
        value: session?.eventType ?? 'No event received yet',
      },
    ],
    [session],
  );

  useEffect(() => {
    setIsHttpsPage(window.location.protocol === 'https:');
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!TRUSTED_ORIGINS.has(event.origin)) {
        return;
      }

      const payload = parseMessageData(event.data);
      const eventType = findEventType(payload);
      const wabaId = findNestedString(
        payload,
        new Set([
          'wabaid',
          'wabid',
          'whatsappbusinessaccountid',
          'whatsappaccountid',
        ]),
      );
      const phoneNumberId = findNestedString(
        payload,
        new Set(['phonenumberid', 'phoneid', 'whatsappphonenumberid']),
      );

      const payloadText =
        typeof payload === 'string' ? payload.toLowerCase() : undefined;
      const looksRelevant =
        Boolean(wabaId || phoneNumberId) ||
        Boolean(eventType?.toLowerCase().includes('whatsapp')) ||
        Boolean(eventType?.toLowerCase().includes('signup')) ||
        Boolean(payloadText?.includes('whatsapp')) ||
        Boolean(payloadText?.includes('signup'));

      if (!looksRelevant) {
        return;
      }

      setSession({
        eventType,
        wabaId,
        phoneNumberId,
        payload,
        receivedAt: new Date().toISOString(),
      });

      if (wabaId || phoneNumberId) {
        toast.success('Embedded signup session info received.');
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const submitSignupCode = useCallback(
    async (code: string, currentSession: EmbeddedSignupSession | null) => {
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/waba/embedded-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            wabaId: currentSession?.wabaId ?? null,
            phoneNumberId: currentSession?.phoneNumberId ?? null,
            sessionPayload: currentSession?.payload ?? null,
          }),
        });

        const json = await response.json().catch(() => null);

        if (!response.ok || json?.status !== 'success') {
          throw new Error(json?.message || 'Failed to hand off signup data');
        }

        toast.success(
          'Facebook signup completed. The authorization code was sent to the backend.',
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to send signup data to the backend',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const fbLoginCallback = useCallback(
    (response: FacebookLoginResponse) => {
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

      void submitSignupCode(code, session);
    },
    [session, submitSignupCode],
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
    window.FB.login(fbLoginCallback, {
      config_id: FACEBOOK_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: SIGNUP_EXTRAS,
    });
  }, [fbLoginCallback, isHttpsPage]);

  return (
    <>
      <Script
        id="facebook-sdk-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.fbAsyncInit = function() {
              FB.init({
                appId: '${FACEBOOK_APP_ID}',
                autoLogAppEvents: true,
                xfbml: true,
                version: '${FACEBOOK_SDK_VERSION}'
              });
            };
          `,
        }}
      />
      <Script
        id="facebook-jssdk"
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          setSdkReady(true);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="text-muted-foreground" />
              Facebook Embedded Signup
            </CardTitle>
            <CardDescription>
              Launch the WhatsApp Embedded Signup flow and capture the session
              data needed for backend token exchange.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-5">
              <div className="flex flex-col gap-2">
                <p className="font-medium">What this flow captures</p>
                <p className="text-sm text-muted-foreground">
                  When the user completes Facebook for Business Login, this
                  screen stores the embedded signup session locally and sends
                  the returned authorization code, WABA ID, and phone number ID
                  to the backend.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Signup action</p>
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-fit"
                onClick={launchWhatsAppSignup}
                disabled={
                  !sdkReady || !isHttpsPage || isLaunching || isSubmitting
                }
              >
                {(isLaunching || isSubmitting) && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                Login with Facebook
              </Button>
              <p className="text-sm text-muted-foreground">
                {!isHttpsPage
                  ? 'Facebook Login only works on HTTPS pages. Use an HTTPS tunnel or deployed environment for this step.'
                  : sdkReady
                    ? 'Facebook SDK loaded. The button is ready to open Embedded Signup.'
                    : 'Loading the Facebook SDK before opening Embedded Signup.'}
              </p>
            </div>

            <div className="grid gap-3 rounded-xl border border-dashed border-border bg-background/80 p-4">
              {sessionSummary.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {item.value}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {authorizationCode
                ? 'Authorization code received and queued for backend exchange.'
                : 'Complete the flow to receive the authorization code from Facebook.'}
            </p>
          </CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-muted-foreground" />
              Before you connect
            </CardTitle>
            <CardDescription>
              A simple checklist for the embedded onboarding flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <Badge variant={sdkReady ? 'default' : 'secondary'}>
                SDK {sdkReady ? 'Ready' : 'Loading'}
              </Badge>
              <Badge variant={isHttpsPage ? 'default' : 'secondary'}>
                HTTPS {isHttpsPage ? 'Ready' : 'Required'}
              </Badge>
              <Badge variant={hasSessionIdentifiers ? 'default' : 'secondary'}>
                IDs {hasSessionIdentifiers ? 'Captured' : 'Pending'}
              </Badge>
              <Badge variant={authorizationCode ? 'default' : 'secondary'}>
                Code {authorizationCode ? 'Received' : 'Pending'}
              </Badge>
            </div>
            <p>Use a Facebook Business account with admin access.</p>
            <p>Prepare your business profile details and display name.</p>
            <p>Make sure the phone number is available for WhatsApp setup.</p>
            <p>
              After the flow returns a code, the backend can exchange it
              server-to-server for the access token used in the final
              integration.
            </p>
            {session?.receivedAt ? (
              <p className="text-xs">
                Last signup event received at {session.receivedAt}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
