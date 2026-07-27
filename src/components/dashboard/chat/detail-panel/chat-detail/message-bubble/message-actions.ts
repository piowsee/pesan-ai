import type { ChatMessage } from '@/types/chat';

export type MessageAction = 'copy' | 'open' | 'save';
export type MessageMenuErrorCode =
  | 'clipboardPermission'
  | 'clipboardUnsupported'
  | 'fileOpenFailed'
  | 'fileSaveFailed'
  | 'formatUnsupported'
  | 'mediaFetchFailed'
  | 'savePickerUnsupported'
  | 'signedUrlInvalid'
  | 'urlUnavailable';

export type GetMediaUrl = () => Promise<string | undefined>;

type MessageActionInput = {
  action: MessageAction;
  getMediaUrl?: GetMediaUrl;
  message: ChatMessage;
};

type ResolvedMedia = {
  blob: Blob;
  mimeType: string;
};

type SaveFileHandle = {
  createWritable: () => Promise<{
    abort?: () => Promise<void>;
    close: () => Promise<void>;
    write: (blob: Blob) => Promise<void>;
  }>;
};

type SaveFilePickerOptions = {
  id?: string;
  suggestedName?: string;
  types?: Array<{
    accept: Record<string, string[]>;
    description?: string;
  }>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions,
  ) => Promise<SaveFileHandle>;
};

const storageAccessErrorPattern =
  /InvalidAccessKeyId|ExpiredToken|RequestExpired|Request has expired|AccessDenied|SignatureDoesNotMatch|AuthorizationQueryParametersError/i;

export class MessageMenuError extends Error {
  constructor(readonly code: MessageMenuErrorCode) {
    super(code);
    this.name = 'MessageMenuError';
  }
}

function normalizeMimeType(mimeType: string | null | undefined) {
  return mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';
}

function isAllowedMediaUrl(value: string) {
  try {
    const url = new URL(value, window.location.href);
    return ['blob:', 'http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function resolveMediaUrl(getMediaUrl?: GetMediaUrl) {
  let mediaUrl: string | undefined;

  try {
    mediaUrl = await getMediaUrl?.();
  } catch {
    throw new MessageMenuError('urlUnavailable');
  }

  const normalizedUrl = mediaUrl?.trim();
  if (!normalizedUrl || !isAllowedMediaUrl(normalizedUrl)) {
    throw new MessageMenuError('urlUnavailable');
  }

  return normalizedUrl;
}

async function getResponseErrorText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function isInvalidSignedUrlResponse(response: Response, responseText: string) {
  return (
    response.status === 401 ||
    response.status === 403 ||
    storageAccessErrorPattern.test(responseText)
  );
}

async function fetchMedia({
  getMediaUrl,
  message,
}: Pick<
  MessageActionInput,
  'getMediaUrl' | 'message'
>): Promise<ResolvedMedia> {
  const mediaUrl = await resolveMediaUrl(getMediaUrl);
  let response: Response;

  try {
    response = await fetch(mediaUrl);
  } catch {
    throw new MessageMenuError('mediaFetchFailed');
  }

  if (!response.ok) {
    const responseText = await getResponseErrorText(response);

    if (isInvalidSignedUrlResponse(response, responseText)) {
      throw new MessageMenuError('signedUrlInvalid');
    }

    throw new MessageMenuError('mediaFetchFailed');
  }

  let blob: Blob;

  try {
    blob = await response.blob();
  } catch {
    throw new MessageMenuError('mediaFetchFailed');
  }

  if (blob.size === 0) {
    throw new MessageMenuError('mediaFetchFailed');
  }

  const responseMimeType = normalizeMimeType(
    response.headers.get('content-type') || blob.type,
  );
  const declaredMimeType = normalizeMimeType(message.mediaMimeType);
  const mimeType =
    !responseMimeType || responseMimeType === 'application/octet-stream'
      ? declaredMimeType || responseMimeType
      : responseMimeType;

  if (!mimeType) {
    throw new MessageMenuError('mediaFetchFailed');
  }

  return {
    blob:
      normalizeMimeType(blob.type) === mimeType
        ? blob
        : new Blob([blob], { type: mimeType }),
    mimeType,
  };
}

async function openMedia(input: MessageActionInput) {
  const mediaUrl = await resolveMediaUrl(input.getMediaUrl);

  try {
    window.open(mediaUrl, '_blank', 'noopener,noreferrer');
  } catch {
    throw new MessageMenuError('fileOpenFailed');
  }
}

function getFileExtension(mimeType: string) {
  if (mimeType === 'application/octet-stream') {
    return undefined;
  }

  const extensionByMimeType: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'video/mp4': 'mp4',
  };

  return extensionByMimeType[mimeType] ?? mimeType.split('/')[1]?.split('+')[0];
}

function getDownloadFilename(message: ChatMessage, mimeType: string) {
  if (message.mediaFilename?.trim()) {
    return message.mediaFilename;
  }

  const extension = getFileExtension(mimeType);
  return extension ? `${message.type}.${extension}` : message.type;
}

function getSavePicker() {
  const showSaveFilePicker = (window as SaveFilePickerWindow)
    .showSaveFilePicker;

  if (!showSaveFilePicker) {
    throw new MessageMenuError('savePickerUnsupported');
  }

  return showSaveFilePicker.bind(window);
}

function getFilenameExtension(filename: string) {
  const dotIndex = filename.lastIndexOf('.');
  const extension = dotIndex >= 0 ? filename.slice(dotIndex) : '';

  return /^\.[a-z0-9]{1,15}$/i.test(extension) ? extension : null;
}

function getSavePickerOptions(message: ChatMessage): SaveFilePickerOptions {
  const mimeType = normalizeMimeType(message.mediaMimeType);
  const suggestedName = getDownloadFilename(
    message,
    mimeType || 'application/octet-stream',
  );
  const extension = getFilenameExtension(suggestedName);

  return {
    id: 'message-media',
    suggestedName,
    ...(mimeType && extension
      ? {
          types: [
            {
              accept: { [mimeType]: [extension] },
              description: 'Media file',
            },
          ],
        }
      : {}),
  };
}

function isFilePickerCancelled(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function chooseSaveFile(message: ChatMessage) {
  try {
    return await getSavePicker()(getSavePickerOptions(message));
  } catch (error) {
    if (isFilePickerCancelled(error)) {
      return null;
    }

    if (error instanceof MessageMenuError) {
      throw error;
    }

    throw new MessageMenuError('fileSaveFailed');
  }
}

async function writeFile(handle: SaveFileHandle, blob: Blob) {
  const writable = await handle.createWritable();

  try {
    await writable.write(blob);
    await writable.close();
  } catch {
    await writable.abort?.().catch(() => undefined);
    throw new MessageMenuError('fileSaveFailed');
  }
}

async function saveMedia(input: MessageActionInput) {
  const handle = await chooseSaveFile(input.message);
  if (!handle) {
    return;
  }

  const { blob } = await fetchMedia(input);
  await writeFile(handle, blob);
}

function hasTextClipboardApi() {
  return (
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.writeText === 'function'
  );
}

function hasMediaClipboardApi() {
  return (
    typeof ClipboardItem !== 'undefined' &&
    typeof ClipboardItem.supports === 'function' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.write === 'function'
  );
}

function clipboardSupports(mimeType: string) {
  try {
    return ClipboardItem.supports(mimeType);
  } catch {
    return false;
  }
}

function isClipboardPermissionError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  );
}

async function convertImageToPng(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The image could not be decoded'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');

    if (!context || canvas.width === 0 || canvas.height === 0) {
      throw new Error('The image could not be rendered');
    }

    context.drawImage(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (pngBlob && pngBlob.size > 0) {
          resolve(pngBlob);
          return;
        }

        reject(new Error('The image could not be converted'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function getClipboardImage(resolvedMedia: ResolvedMedia) {
  if (resolvedMedia.mimeType === 'image/png') {
    return resolvedMedia;
  }

  try {
    return {
      blob: await convertImageToPng(resolvedMedia.blob),
      mimeType: 'image/png',
    };
  } catch {
    throw new MessageMenuError('formatUnsupported');
  }
}

async function copyText(message: ChatMessage) {
  if (!hasTextClipboardApi()) {
    throw new MessageMenuError('clipboardUnsupported');
  }

  try {
    await navigator.clipboard.writeText(message.content ?? '');
  } catch (error) {
    throw new MessageMenuError(
      isClipboardPermissionError(error)
        ? 'clipboardPermission'
        : 'formatUnsupported',
    );
  }
}

async function copyMedia(input: MessageActionInput) {
  if (input.message.type !== 'image') {
    throw new MessageMenuError('formatUnsupported');
  }

  if (!hasMediaClipboardApi()) {
    throw new MessageMenuError('clipboardUnsupported');
  }

  const clipboardMedia = await getClipboardImage(await fetchMedia(input));

  if (!clipboardSupports(clipboardMedia.mimeType)) {
    throw new MessageMenuError('formatUnsupported');
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [clipboardMedia.mimeType]: clipboardMedia.blob,
      }),
    ]);
  } catch {
    throw new MessageMenuError('clipboardPermission');
  }
}

async function copyMessage(input: MessageActionInput) {
  if (input.message.type === 'text') {
    await copyText(input.message);
    return;
  }

  await copyMedia(input);
}

export async function runMessageAction(input: MessageActionInput) {
  if (input.action === 'copy') {
    await copyMessage(input);
    return;
  }

  if (input.action === 'open') {
    await openMedia(input);
    return;
  }

  await saveMedia(input);
}
