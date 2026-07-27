import type { ChatMessage } from '@/types/chat';

type DocumentDescriptor = Pick<ChatMessage, 'mediaFilename' | 'mediaMimeType'>;

type DocumentFormat = {
  mimeTypes: readonly string[];
  previewable: boolean;
};

const documentFormats = {
  '7z': {
    mimeTypes: ['application/x-7z-compressed'],
    previewable: false,
  },
  csv: {
    mimeTypes: ['text/csv'],
    previewable: true,
  },
  doc: {
    mimeTypes: ['application/msword'],
    previewable: false,
  },
  docx: {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    previewable: false,
  },
  json: {
    mimeTypes: ['application/json'],
    previewable: true,
  },
  md: {
    mimeTypes: ['text/markdown'],
    previewable: false,
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    previewable: true,
  },
  ppt: {
    mimeTypes: ['application/vnd.ms-powerpoint'],
    previewable: false,
  },
  pptx: {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    previewable: false,
  },
  rar: {
    mimeTypes: ['application/vnd.rar', 'application/x-rar-compressed'],
    previewable: false,
  },
  txt: {
    mimeTypes: ['text/plain'],
    previewable: true,
  },
  xls: {
    mimeTypes: ['application/vnd.ms-excel'],
    previewable: false,
  },
  xlsx: {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    previewable: false,
  },
  xml: {
    mimeTypes: ['application/xml', 'text/xml'],
    previewable: true,
  },
  zip: {
    mimeTypes: ['application/zip'],
    previewable: false,
  },
} as const satisfies Record<string, DocumentFormat>;

type DocumentExtension = keyof typeof documentFormats;

const documentExtensionByMimeType = new Map<string, DocumentExtension>(
  Object.entries(documentFormats).flatMap(([extension, format]) =>
    format.mimeTypes.map(
      (mimeType) => [mimeType, extension as DocumentExtension] as const,
    ),
  ),
);

function normalizeMimeType(mimeType?: string | null) {
  return mimeType?.split(';')[0]?.trim().toLowerCase() || null;
}

function getFilenameExtension(filename?: string | null) {
  const extension = filename?.split('.').pop()?.trim().toLowerCase();

  return extension && extension !== filename ? extension : null;
}

function getDocumentExtension({
  mediaFilename,
  mediaMimeType,
}: DocumentDescriptor) {
  const filenameExtension = getFilenameExtension(mediaFilename);

  if (filenameExtension) {
    return filenameExtension;
  }

  const mimeType = normalizeMimeType(mediaMimeType);

  return mimeType ? (documentExtensionByMimeType.get(mimeType) ?? null) : null;
}

function canPreviewDocument({
  mediaFilename,
  mediaMimeType,
}: DocumentDescriptor) {
  const mimeType = normalizeMimeType(mediaMimeType);

  if (mimeType && mimeType !== 'application/octet-stream') {
    const extension = documentExtensionByMimeType.get(mimeType);

    return extension ? documentFormats[extension].previewable : false;
  }

  const extension = getFilenameExtension(mediaFilename);

  return extension && extension in documentFormats
    ? documentFormats[extension as DocumentExtension].previewable
    : false;
}

export { canPreviewDocument, getDocumentExtension };
