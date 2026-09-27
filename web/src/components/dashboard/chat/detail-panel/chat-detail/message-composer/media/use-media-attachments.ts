import {
  type ChangeEvent,
  type ClipboardEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { MediaInputRefs, MediaPickerType, SelectedMedia } from '../types';
import { MAX_MEDIA_FILES } from './media-config';
import { getClipboardFiles, normalizeMediaFile } from './media-utils';

type UseMediaAttachmentsOptions = {
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onAudioCaptionNotSupported: () => void;
  onMaxFilesExceeded: (max: number) => void;
  onUnsupportedFile: (file: File) => void;
};

export function useMediaAttachments({
  draft,
  setDraft,
  textareaRef,
  onAudioCaptionNotSupported,
  onMaxFilesExceeded,
  onUnsupportedFile,
}: UseMediaAttachmentsOptions) {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [captionTargetIndex, setCaptionTargetIndex] = useState(-1);
  const selectedMediaRef = useRef<SelectedMedia[]>([]);
  const inputRefs: MediaInputRefs = {
    audio: useRef<HTMLInputElement>(null),
    document: useRef<HTMLInputElement>(null),
    'photo-video': useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    return () => {
      selectedMediaRef.current.forEach((media) =>
        URL.revokeObjectURL(media.previewUrl),
      );
    };
  }, []);

  const getMediaListWithSavedDraft = useCallback(() => {
    const list = [...selectedMedia];
    if (captionTargetIndex !== -1 && list[captionTargetIndex]) {
      list[captionTargetIndex] = {
        ...list[captionTargetIndex],
        caption: draft,
      };
    }
    return list;
  }, [captionTargetIndex, draft, selectedMedia]);

  const addMediaFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const validFiles = files.flatMap((file) => {
        const normalizedFile = normalizeMediaFile(file);
        if (!normalizedFile) {
          onUnsupportedFile(file);
          return [];
        }
        return [normalizedFile];
      });

      const baseList = getMediaListWithSavedDraft();
      const availableSlots = Math.max(MAX_MEDIA_FILES - baseList.length, 0);

      if (validFiles.length > availableSlots) {
        onMaxFilesExceeded(MAX_MEDIA_FILES);
      }

      const newMedia = validFiles.slice(0, availableSlots).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      }));
      if (newMedia.length === 0) return;

      const nextList = [...baseList, ...newMedia];
      let nextIndex = captionTargetIndex;
      if (nextIndex === -1 || nextIndex >= nextList.length) {
        nextIndex = nextList.findIndex(
          (media) => !media.file.type.startsWith('audio/'),
        );
      }

      setSelectedMedia(nextList);
      setCaptionTargetIndex(nextIndex);

      if (nextIndex !== captionTargetIndex && captionTargetIndex !== -1) {
        setDraft(nextIndex !== -1 ? nextList[nextIndex].caption || '' : '');
      }

      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [
      captionTargetIndex,
      getMediaListWithSavedDraft,
      onMaxFilesExceeded,
      onUnsupportedFile,
      setDraft,
      textareaRef,
    ],
  );

  const clearSelectedMedia = useCallback(() => {
    setSelectedMedia((current) => {
      current.forEach((media) => URL.revokeObjectURL(media.previewUrl));
      return [];
    });
    setCaptionTargetIndex(-1);
  }, []);

  const removeMedia = (indexToRemove: number) => {
    const nextMedia = getMediaListWithSavedDraft();
    const removedMedia = nextMedia[indexToRemove];
    if (!removedMedia) return;

    URL.revokeObjectURL(removedMedia.previewUrl);
    nextMedia.splice(indexToRemove, 1);

    let nextTargetIndex = captionTargetIndex;
    let nextDraft = draft;

    if (indexToRemove === captionTargetIndex) {
      nextTargetIndex = nextMedia.findIndex(
        (media) => !media.file.type.startsWith('audio/'),
      );
      nextDraft =
        nextTargetIndex !== -1 ? nextMedia[nextTargetIndex].caption || '' : '';
    } else if (captionTargetIndex > indexToRemove) {
      nextTargetIndex = captionTargetIndex - 1;
    }

    setSelectedMedia(nextMedia);
    setCaptionTargetIndex(nextTargetIndex);
    if (indexToRemove === captionTargetIndex) {
      setDraft(nextDraft);
    }
  };

  const selectCaptionTarget = (nextIndex: number) => {
    if (nextIndex === captionTargetIndex) return;

    const targetMedia = selectedMedia[nextIndex];
    if (targetMedia?.file.type.startsWith('audio/')) {
      onAudioCaptionNotSupported();
      return;
    }

    const nextList = getMediaListWithSavedDraft();
    setSelectedMedia(nextList);
    setCaptionTargetIndex(nextIndex);
    setDraft(nextIndex !== -1 ? nextList[nextIndex]?.caption || '' : '');
    textareaRef.current?.focus();
  };

  const openFilePicker = (type: MediaPickerType) => {
    inputRefs[type].current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    addMediaFiles(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = getClipboardFiles(event.clipboardData);
    if (files.length === 0) return;

    event.preventDefault();
    addMediaFiles(files);
  };

  return {
    addMediaFiles,
    captionTargetIndex,
    clearSelectedMedia,
    handleFileChange,
    handlePaste,
    inputRefs,
    openFilePicker,
    removeMedia,
    selectCaptionTarget,
    selectedMedia,
  };
}
