import { WabaSwitcher } from '@/components/dashboard/chat/header-panel/waba-switcher';
import type { Waba } from '@/hooks/use-wabas';

interface ChatWorkspaceHeaderProps {
  wabas: Waba[];
  activeWabaId?: string;
  onSelectWaba: (wabaId: string) => void;
}

export function ChatWorkspaceHeader({
  activeWabaId,
  onSelectWaba,
  wabas,
}: ChatWorkspaceHeaderProps) {
  return (
    <div className="shrink-0 bg-background z-10 relative border-b border-brand/15">
      <div className="flex h-15 items-center px-4">
        <WabaSwitcher
          wabas={wabas}
          activeWabaId={activeWabaId}
          onSelectWaba={onSelectWaba}
        />
      </div>
    </div>
  );
}
