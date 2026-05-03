'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

type ChecklistBadge = {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
};

type Props = {
  sdkReady: boolean;
  isHttpsPage: boolean;
  hasSessionIdentifiers: boolean;
  hasAuthorizationCode: boolean;
  lastEventAt?: string;
};

const CHECKLIST_TIPS = [
  'Use a Facebook Business account with admin access.',
  'Prepare your business profile details and display name.',
  'Make sure the phone number is available for WhatsApp setup.',
  'After the flow returns a code, the backend can exchange it server-to-server for the access token used in the final integration.',
] as const;

function buildBadges({
  sdkReady,
  isHttpsPage,
  hasSessionIdentifiers,
  hasAuthorizationCode,
}: Omit<Props, 'lastEventAt'>): ChecklistBadge[] {
  return [
    {
      label: 'SDK',
      active: sdkReady,
      activeText: 'Ready',
      inactiveText: 'Loading',
    },
    {
      label: 'HTTPS',
      active: isHttpsPage,
      activeText: 'Ready',
      inactiveText: 'Required',
    },
    {
      label: 'IDs',
      active: hasSessionIdentifiers,
      activeText: 'Captured',
      inactiveText: 'Pending',
    },
    {
      label: 'Code',
      active: hasAuthorizationCode,
      activeText: 'Received',
      inactiveText: 'Pending',
    },
  ];
}

/**
 * Sidebar checklist card shown alongside the embedded signup form.
 * It displays readiness badges and helpful tips for completing the flow.
 */
export function WabaSignupChecklist({
  sdkReady,
  isHttpsPage,
  hasSessionIdentifiers,
  hasAuthorizationCode,
  lastEventAt,
}: Props) {
  const badges = buildBadges({
    sdkReady,
    isHttpsPage,
    hasSessionIdentifiers,
    hasAuthorizationCode,
  });

  return (
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
          {badges.map(({ label, active, activeText, inactiveText }) => (
            <Badge key={label} variant={active ? 'default' : 'secondary'}>
              {label} {active ? activeText : inactiveText}
            </Badge>
          ))}
        </div>

        {CHECKLIST_TIPS.map((tip) => (
          <p key={tip}>{tip}</p>
        ))}

        {lastEventAt && (
          <p className="text-xs">
            Last signup event received at {lastEventAt}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
