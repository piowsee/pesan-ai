import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { WhatsAppTextFormat } from '../../whatsapp-text';
import {
  type TextareaEdit,
  createTextFormatEdit,
  getActiveFormats,
  getContinuedLinePrefix,
  getCurrentLine,
} from '../formatting/text-format-utils';

const composerFocusExclusionSelector = [
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="textbox"]',
  '[data-composer-focus-exempt]',
].join(',');

function shouldPreserveCurrentFocus(
  activeElement: Element | null,
  composerElement: HTMLTextAreaElement | null,
) {
  if (
    !activeElement ||
    activeElement === document.body ||
    activeElement === document.documentElement ||
    activeElement === composerElement
  ) {
    return false;
  }

  return Boolean(activeElement.closest(composerFocusExclusionSelector));
}

function isPrintableComposerKey(event: KeyboardEvent) {
  return (
    event.key.length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing
  );
}

function resizeComposerTextarea(element: HTMLTextAreaElement) {
  const maxHeightPx = 128;
  element.style.height = 'auto';
  element.style.height = `${Math.min(element.scrollHeight, maxHeightPx)}px`;
  element.style.overflowY =
    element.scrollHeight > maxHeightPx ? 'auto' : 'hidden';

  if (element.selectionStart === element.value.length) {
    element.scrollTop = element.scrollHeight;
  }
}

export function useComposerText({
  canSendFreeform,
  conversationId,
  focusRequest,
}: {
  canSendFreeform: boolean;
  conversationId: string;
  focusRequest: number;
}) {
  const [draft, setDraft] = useState('');
  const [selectionRange, setSelectionRange] = useState<[number, number]>([
    0, 0,
  ]);
  const [isFormatToolbarDismissed, setIsFormatToolbarDismissed] =
    useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const syncOverlayScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const resizeTextarea = useCallback(
    (target?: HTMLTextAreaElement | null) => {
      const element = target ?? textareaRef.current;
      if (!element) return;

      resizeComposerTextarea(element);
      syncOverlayScroll();
    },
    [syncOverlayScroll],
  );

  const resetTextarea = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = '40px';
    textareaRef.current.style.overflowY = 'hidden';
  }, []);

  const replaceTextareaRange = useCallback((edit: TextareaEdit) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.setSelectionRange(edit.start, edit.end);
    // `insertText` preserves the textarea undo stack and inserts plain text.
    // codeql[js/xss-through-dom]
    document.execCommand('insertText', false, edit.replacement);
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    setDraft(textarea.value);
  }, []);

  useEffect(() => {
    syncOverlayScroll();
  }, [draft, syncOverlayScroll]);

  useEffect(() => {
    if (focusRequest !== 0 && canSendFreeform) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [canSendFreeform, focusRequest]);

  useEffect(() => {
    if (!canSendFreeform) return;

    const frameId = requestAnimationFrame(() => {
      const composerElement = textareaRef.current;
      if (
        !shouldPreserveCurrentFocus(document.activeElement, composerElement)
      ) {
        composerElement?.focus({ preventScroll: true });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [canSendFreeform, conversationId]);

  useEffect(() => {
    if (!canSendFreeform) return;

    const handleDefaultComposerTyping = (event: KeyboardEvent) => {
      const composerElement = textareaRef.current;
      if (
        event.defaultPrevented ||
        !composerElement ||
        document.activeElement === composerElement ||
        shouldPreserveCurrentFocus(document.activeElement, composerElement) ||
        !isPrintableComposerKey(event)
      ) {
        return;
      }

      event.preventDefault();
      composerElement.focus({ preventScroll: true });
      const selectionStart = composerElement.selectionStart;
      replaceTextareaRange({
        replacement: event.key,
        start: selectionStart,
        end: composerElement.selectionEnd,
        selectionStart: selectionStart + event.key.length,
        selectionEnd: selectionStart + event.key.length,
      });
      setIsFormatToolbarDismissed(false);
    };

    document.addEventListener('keydown', handleDefaultComposerTyping);
    return () =>
      document.removeEventListener('keydown', handleDefaultComposerTyping);
  }, [canSendFreeform, replaceTextareaRange]);

  useEffect(() => {
    resetTextarea();
  }, [conversationId, resetTextarea]);

  const applyTextFormat = (format: WhatsAppTextFormat) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const edit = createTextFormatEdit({
      value: textarea.value,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      format,
    });
    if (!edit) return;

    replaceTextareaRange(edit);
    setSelectionRange([edit.selectionStart, edit.selectionEnd]);
    resizeTextarea(textarea);
  };

  const insertTextAtSelection = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const nextSelection = start + text.length;
    replaceTextareaRange({
      replacement: text,
      start,
      end: textarea.selectionEnd,
      selectionStart: nextSelection,
      selectionEnd: nextSelection,
    });
    setIsFormatToolbarDismissed(false);
    resizeTextarea(textarea);
  };

  const continueCurrentLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (selectionStart !== selectionEnd) {
      insertTextAtSelection('\n');
      return;
    }

    const { line, lineStart, lineEnd } = getCurrentLine(draft, selectionStart);
    const continuedPrefix = getContinuedLinePrefix(line);

    if (continuedPrefix === '') {
      replaceTextareaRange({
        replacement: '',
        start: lineStart,
        end: lineEnd,
        selectionStart: lineStart,
        selectionEnd: lineStart,
      });
      resizeTextarea(textarea);
      return;
    }

    insertTextAtSelection(`\n${continuedPrefix ?? ''}`);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    resizeTextarea(event.currentTarget);
  };

  const handleSelect = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const nextSelection: [number, number] = [
      target.selectionStart,
      target.selectionEnd,
    ];
    setSelectionRange(nextSelection);
    if (nextSelection[0] === nextSelection[1]) {
      setIsFormatToolbarDismissed(false);
    }
  };

  const resetText = () => {
    setDraft('');
    setIsFormatToolbarDismissed(false);
    resetTextarea();
  };

  const isSelectionActive = selectionRange[0] !== selectionRange[1];

  return {
    activeFormats: getActiveFormats(
      draft,
      selectionRange[0],
      selectionRange[1],
    ),
    applyTextFormat,
    closeFormatToolbar: () => setIsFormatToolbarDismissed(true),
    continueCurrentLine,
    draft,
    handleChange,
    handleSelect,
    overlayRef,
    resetText,
    setDraft,
    showFormatToolbar:
      canSendFreeform &&
      draft.length > 0 &&
      isSelectionActive &&
      !isFormatToolbarDismissed,
    syncOverlayScroll,
    textareaRef,
  };
}
