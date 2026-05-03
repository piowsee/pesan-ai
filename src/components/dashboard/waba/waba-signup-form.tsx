'use client';

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
import type { EmbeddedSignupSession } from '@/hooks/use-embedded-signup-session';
import { Layers, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  sdkReady: boolean;
  isHttpsPage: boolean;
  isLaunching: boolean;
  isSubmitting: boolean;
  session: EmbeddedSignupSession | null;
  authorizationCode: string | null;
  onLaunch: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveStatusText(sdkReady: boolean, isHttpsPage: boolean): string {
  if (!isHttpsPage) {
    return 'Facebook Login only works on HTTPS pages. Use an HTTPS tunnel or deployed environment for this step.';
  }
  if (sdkReady) {
    return 'Facebook SDK loaded. The button is ready to open Embedded Signup.';
  }
  return 'Loading the Facebook SDK before opening Embedded Signup.';
}

type SessionSummaryItem = { label: string; value: string };

function buildSessionSummary(
  session: EmbeddedSignupSession | null,
): SessionSummaryItem[] {
  return [
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
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Main embedded-signup action card.
 * Renders the launch button, session summary grid, and footer status text.
 */
export function WabaSignupForm({
  sdkReady,
  isHttpsPage,
  isLaunching,
  isSubmitting,
  session,
  authorizationCode,
  onLaunch,
}: Props) {
  const sessionSummary = useMemo(() => buildSessionSummary(session), [session]);

  const isBusy = isLaunching || isSubmitting;
  const statusText = resolveStatusText(sdkReady, isHttpsPage);
  const footerText = authorizationCode
    ? 'Authorization code received and queued for backend exchange.'
    : 'Complete the flow to receive the authorization code from Facebook.';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="text-muted-foreground" />
          Facebook Embedded Signup
        </CardTitle>
        <CardDescription>
          Launch the WhatsApp Embedded Signup flow and capture the session data
          needed for backend token exchange.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-5">
          <div className="flex flex-col gap-2">
            <p className="font-medium">What this flow captures</p>
            <p className="text-sm text-muted-foreground">
              When the user completes Facebook for Business Login, this screen
              stores the embedded signup session locally and sends the returned
              authorization code, WABA ID, and phone number ID to the backend.
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
            onClick={onLaunch}
            disabled={!sdkReady || !isHttpsPage || isBusy}
          >
            {isBusy && (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            )}
            Login with Facebook
          </Button>
          <p className="text-sm text-muted-foreground">{statusText}</p>
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
        <p className="text-xs text-muted-foreground">{footerText}</p>
      </CardFooter>
    </Card>
  );
}
