import { type RefObject, useEffect, useRef, useState } from 'react';

import { hasDraggedFiles, isDragInsideElement } from './media-utils';

export function useMediaDragDrop({
  canSendFreeform,
  mediaDropAreaRef,
  mediaDropZoneRef,
  onAddFiles,
}: {
  canSendFreeform: boolean;
  mediaDropAreaRef?: RefObject<HTMLElement | null>;
  mediaDropZoneRef: RefObject<HTMLDivElement | null>;
  onAddFiles: (files: File[]) => void;
}) {
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [isDraggingOverDropZone, setIsDraggingOverDropZone] = useState(false);
  const onAddFilesRef = useRef(onAddFiles);

  useEffect(() => {
    onAddFilesRef.current = onAddFiles;
  }, [onAddFiles]);

  useEffect(() => {
    const dropArea = mediaDropAreaRef?.current;
    if (!dropArea) return;

    const getFileTransfer = (event: globalThis.DragEvent) => {
      const { dataTransfer } = event;
      return dataTransfer && hasDraggedFiles(dataTransfer)
        ? dataTransfer
        : null;
    };

    const resetMediaDragState = () => {
      setIsDraggingMedia(false);
      setIsDraggingOverDropZone(false);
    };

    const handleDragEnter = (event: globalThis.DragEvent) => {
      if (!getFileTransfer(event)) return;

      event.preventDefault();
      if (canSendFreeform) setIsDraggingMedia(true);
    };

    const handleDocumentDragOver = (event: globalThis.DragEvent) => {
      const dataTransfer = getFileTransfer(event);
      if (!dataTransfer) return;

      if (!isDragInsideElement(event, dropArea) || !canSendFreeform) {
        resetMediaDragState();
        return;
      }

      event.preventDefault();
      dataTransfer.dropEffect = 'copy';
      setIsDraggingMedia(true);
      setIsDraggingOverDropZone(
        isDragInsideElement(event, mediaDropZoneRef.current),
      );
    };

    const handleDragLeave = (event: globalThis.DragEvent) => {
      const nextTarget = event.relatedTarget;
      const remainsInsideDropArea =
        nextTarget instanceof Node && dropArea.contains(nextTarget);

      if (!remainsInsideDropArea && !isDragInsideElement(event, dropArea)) {
        resetMediaDragState();
      }
    };

    const handleDocumentDragLeave = (event: globalThis.DragEvent) => {
      const isOutsideViewport =
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight;

      if (isOutsideViewport) resetMediaDragState();
    };

    const handleDrop = (event: globalThis.DragEvent) => {
      const dataTransfer = getFileTransfer(event);
      if (!dataTransfer) return;

      event.preventDefault();
      resetMediaDragState();
      if (canSendFreeform) {
        onAddFilesRef.current(Array.from(dataTransfer.files));
      }
    };

    dropArea.addEventListener('dragenter', handleDragEnter);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('dragleave', handleDocumentDragLeave);
    document.addEventListener('dragend', resetMediaDragState);
    document.addEventListener('drop', resetMediaDragState);
    window.addEventListener('blur', resetMediaDragState);

    return () => {
      resetMediaDragState();
      dropArea.removeEventListener('dragenter', handleDragEnter);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('dragleave', handleDocumentDragLeave);
      document.removeEventListener('dragend', resetMediaDragState);
      document.removeEventListener('drop', resetMediaDragState);
      window.removeEventListener('blur', resetMediaDragState);
    };
  }, [canSendFreeform, mediaDropAreaRef, mediaDropZoneRef]);

  return { isDraggingMedia, isDraggingOverDropZone };
}
