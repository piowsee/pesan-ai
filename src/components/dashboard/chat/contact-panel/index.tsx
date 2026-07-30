import { ContactInfoPanel } from '@/components/dashboard/chat/contact-panel/contact-info-panel';
import { useUpdateContactDetails } from '@/hooks/use-contact-details';
import { useDebounce } from '@/hooks/use-debounce';
import type { ChatConversation } from '@/types/chat';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChatContactPanelProps {
  conversation?: ChatConversation;
  isOpen: boolean;
  wabaId: string | undefined;
  onClose: () => void;
  showMobileBackButton: boolean;
}

export function ChatContactPanel({
  conversation,
  isOpen,
  wabaId,
  onClose,
  showMobileBackButton,
}: ChatContactPanelProps) {
  const convId = conversation?.id;

  const { mutate: updateDetails, isPending } = useUpdateContactDetails();

  // Label updates instantly via mutation and cache update.
  const label = conversation?.label ?? '';

  // Local draft state for notes (needed for debouncing text input)
  const [prevConvId, setPrevConvId] = useState(convId);
  const [localNotes, setLocalNotes] = useState(
    conversation?.internalNotes ?? '',
  );

  // Reset notes state when conversation changes.
  if (convId !== prevConvId) {
    setPrevConvId(convId);
    setLocalNotes(conversation?.internalNotes ?? '');
  }

  // Debounced notes save
  const debouncedNotes = useDebounce(localNotes, 3000);
  const prevDebouncedNotesRef = useRef(debouncedNotes);

  useEffect(() => {
    if (
      wabaId &&
      convId &&
      isOpen &&
      debouncedNotes !== prevDebouncedNotesRef.current
    ) {
      prevDebouncedNotesRef.current = debouncedNotes;
      updateDetails({
        wabaId,
        convId,
        params: { internalNotes: debouncedNotes || null },
      });
    }
  }, [debouncedNotes, wabaId, convId, isOpen, updateDetails]);

  const handleLabelChange = useCallback(
    (value: string) => {
      if (wabaId && convId) {
        updateDetails({
          wabaId,
          convId,
          params: { label: value || null },
        });
      }
    },
    [wabaId, convId, updateDetails],
  );

  const handleNotesChange = useCallback((value: string) => {
    setLocalNotes(value);
  }, []);

  if (!conversation || !isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background lg:static lg:z-0 lg:w-90 lg:shrink-0 lg:overflow-hidden lg:border-l">
      <ContactInfoPanel
        conversation={conversation}
        label={label}
        notes={localNotes}
        isSaving={isPending}
        onLabelChange={handleLabelChange}
        onNotesChange={handleNotesChange}
        onClose={onClose}
        showMobileBackButton={showMobileBackButton}
      />
    </div>
  );
}
