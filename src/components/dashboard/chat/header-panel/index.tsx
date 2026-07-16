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
    <div className="relative z-10 shrink-0 bg-background">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
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
