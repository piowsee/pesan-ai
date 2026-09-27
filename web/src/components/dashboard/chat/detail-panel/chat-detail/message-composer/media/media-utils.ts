import {
  defaultPastedFileNameByMimeType,
  mediaMimeTypeByExtension,
  supportedMediaMimeTypes,
} from './media-config';

function getFilenameExtension(filename: string) {
  const extensionStart = filename.lastIndexOf('.');
  return extensionStart === -1
    ? ''
    : filename.slice(extensionStart).toLowerCase();
}

export function normalizeMediaFile(file: File) {
  const normalizedMimeType = file.type.split(';')[0]?.trim().toLowerCase();
  const canInferMimeType =
    !normalizedMimeType || normalizedMimeType === 'application/octet-stream';
  const inferredMimeType = canInferMimeType
    ? mediaMimeTypeByExtension[getFilenameExtension(file.name)]
    : undefined;
  const mimeType = supportedMediaMimeTypes.has(normalizedMimeType)
    ? normalizedMimeType
    : inferredMimeType;

  if (!mimeType) {
    return null;
  }

  const filename =
    file.name.trim() ||
    defaultPastedFileNameByMimeType[mimeType] ||
    'pasted-file';

  if (file.type === mimeType && file.name === filename) {
    return file;
  }

  return new File([file], filename, {
    type: mimeType,
    lastModified: file.lastModified,
  });
}

export function getClipboardFiles(clipboardData: DataTransfer) {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  return itemFiles.length > 0 ? itemFiles : Array.from(clipboardData.files);
}

export function hasDraggedFiles(dataTransfer: DataTransfer) {
  return (
    dataTransfer.files.length > 0 ||
    Array.from(dataTransfer.types).includes('Files')
  );
}

export function isDragInsideElement(
  event: globalThis.DragEvent,
  element: HTMLElement | null,
) {
  if (!element) {
    return false;
  }

  const bounds = element.getBoundingClientRect();
  return (
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom
  );
}

export function formatFileSize(size: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)}${units[unitIndex]}`;
}
