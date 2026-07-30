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

  // Local draft state for label and notes (needed for debouncing inputs)
  const [localLabel, setLocalLabel] = useState(conversation?.label ?? '');
  const [localNotes, setLocalNotes] = useState(
    conversation?.internalNotes ?? '',
  );

  // Debounced save
  const debouncedLabel = useDebounce(localLabel, 3000);
  const debouncedNotes = useDebounce(localNotes, 3000);

  const prevDebouncedLabelRef = useRef(debouncedLabel);
  const prevDebouncedNotesRef = useRef(debouncedNotes);

  // Track latest local values and saved values for unmount flushing
  const latestLocalLabelRef = useRef(localLabel);
  const latestLocalNotesRef = useRef(localNotes);

  useEffect(() => {
    latestLocalLabelRef.current = localLabel;
    latestLocalNotesRef.current = localNotes;
  }, [localLabel, localNotes]);

  const savedLabelRef = useRef(conversation?.label ?? '');
  const savedNotesRef = useRef(conversation?.internalNotes ?? '');

  useEffect(() => {
    if (wabaId && convId && isOpen) {
      const isLabelChanged = debouncedLabel !== prevDebouncedLabelRef.current;
      const isNotesChanged = debouncedNotes !== prevDebouncedNotesRef.current;

      if (isLabelChanged || isNotesChanged) {
        prevDebouncedLabelRef.current = debouncedLabel;
        prevDebouncedNotesRef.current = debouncedNotes;
        savedLabelRef.current = debouncedLabel;
        savedNotesRef.current = debouncedNotes;

        updateDetails({
          wabaId,
          convId,
          params: {
            ...(isLabelChanged ? { label: debouncedLabel || null } : {}),
            ...(isNotesChanged
              ? { internalNotes: debouncedNotes || null }
              : {}),
          },
        });
      }
    }
  }, [debouncedLabel, debouncedNotes, wabaId, convId, isOpen, updateDetails]);

  // Flush pending changes on unmount (e.g. user clicked another conversation before debounce finished)
  useEffect(() => {
    return () => {
      const pendingLabel = latestLocalLabelRef.current;
      const pendingNotes = latestLocalNotesRef.current;

      const isLabelUnsaved = pendingLabel !== savedLabelRef.current;
      const isNotesUnsaved = pendingNotes !== savedNotesRef.current;

      if ((isLabelUnsaved || isNotesUnsaved) && wabaId && convId) {
        updateDetails({
          wabaId,
          convId,
          params: {
            ...(isLabelUnsaved ? { label: pendingLabel || null } : {}),
            ...(isNotesUnsaved ? { internalNotes: pendingNotes || null } : {}),
          },
        });
      }
    };
  }, [wabaId, convId, updateDetails]);

  const handleLabelChange = useCallback((value: string) => {
    setLocalLabel(value);
  }, []);

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
        label={localLabel}
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
