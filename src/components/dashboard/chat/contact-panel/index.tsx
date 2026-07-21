import { ContactInfoPanel } from '@/components/dashboard/chat/contact-panel/contact-info-panel';
import type { ChatConversation } from '@/types/chat';

interface ContactDraft {
  label: string;
  notes: string;
}

interface ChatContactPanelProps {
  conversation?: ChatConversation;
  isOpen: boolean;
  draft: ContactDraft;
  onDraftChange: (draft: ContactDraft) => void;
  onClose: () => void;
  showMobileBackButton: boolean;
}

export function ChatContactPanel({
  conversation,
  draft,
  isOpen,
  onClose,
  onDraftChange,
  showMobileBackButton,
}: ChatContactPanelProps) {
  if (!conversation || !isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background lg:static lg:z-0 lg:w-90 lg:shrink-0 lg:overflow-hidden lg:border-l">
      <ContactInfoPanel
        conversation={conversation}
        label={draft.label}
        notes={draft.notes}
        onLabelChange={(label) => onDraftChange({ ...draft, label })}
        onNotesChange={(notes) => onDraftChange({ ...draft, notes })}
        onClose={onClose}
        showMobileBackButton={showMobileBackButton}
      />
    </div>
  );
}
