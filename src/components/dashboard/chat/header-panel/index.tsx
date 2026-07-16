'use client';

import { PhoneNumberFilter } from '@/components/dashboard/chat/header-panel/phone-number-filter';
import { WabaSwitcher } from '@/components/dashboard/chat/header-panel/waba-switcher';
import type { Waba } from '@/hooks/use-wabas';

interface ChatWorkspaceHeaderProps {
  wabas: Waba[];
  activeWabaId?: string;
  onSelectWaba: (wabaId: string) => void;
  phoneNumbers: Array<{ id: string; displayPhoneNumber: string }>;
  selectedPhoneNumberId?: string;
  onPhoneNumberChange: (value?: string) => void;
}

export function ChatWorkspaceHeader({
  activeWabaId,
  onSelectWaba,
  onPhoneNumberChange,
  wabas,
  phoneNumbers,
  selectedPhoneNumberId,
}: ChatWorkspaceHeaderProps) {
  return (
    <div className="relative z-10 shrink-0 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        <WabaSwitcher
          wabas={wabas}
          activeWabaId={activeWabaId}
          onSelectWaba={onSelectWaba}
        />

        <PhoneNumberFilter
          disabled={!activeWabaId}
          phoneNumbers={phoneNumbers}
          selectedPhoneNumberId={selectedPhoneNumberId}
          onPhoneNumberChange={onPhoneNumberChange}
        />
      </div>
    </div>
  );
}
