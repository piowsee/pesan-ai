import type { MouseEvent } from 'react';
import type { IconType } from 'react-icons';
import {
  FaFile,
  FaFileAudio,
  FaFileCode,
  FaFileCsv,
  FaFileExcel,
  FaFileImage,
  FaFileLines,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileVideo,
  FaFileWord,
  FaFileZipper,
} from 'react-icons/fa6';

import { MessageCaption } from '../message-caption';
import { useMessageOpen } from '../message-menu';
import { formatByteSize } from '../message-utils';
import type { MediaRendererProps } from '../types';
import { getDocumentExtension } from './document-utils';

export type DocumentVisual = {
  Icon: IconType;
  colorClassName: string;
  label: string;
};

const documentVisuals: Record<string, DocumentVisual> = {
  pdf: { Icon: FaFilePdf, colorClassName: 'text-red-600', label: 'PDF' },
  doc: { Icon: FaFileWord, colorClassName: 'text-blue-600', label: 'DOC' },
  docx: { Icon: FaFileWord, colorClassName: 'text-blue-600', label: 'DOCX' },
  xls: { Icon: FaFileExcel, colorClassName: 'text-emerald-600', label: 'XLS' },
  xlsx: {
    Icon: FaFileExcel,
    colorClassName: 'text-emerald-600',
    label: 'XLSX',
  },
  csv: { Icon: FaFileCsv, colorClassName: 'text-emerald-600', label: 'CSV' },
  ppt: {
    Icon: FaFilePowerpoint,
    colorClassName: 'text-orange-600',
    label: 'PPT',
  },
  pptx: {
    Icon: FaFilePowerpoint,
    colorClassName: 'text-orange-600',
    label: 'PPTX',
  },
  txt: {
    Icon: FaFileLines,
    colorClassName: 'text-slate-500',
    label: 'TXT',
  },
  md: {
    Icon: FaFileLines,
    colorClassName: 'text-slate-500',
    label: 'MD',
  },
  zip: {
    Icon: FaFileZipper,
    colorClassName: 'text-amber-600',
    label: 'ZIP',
  },
  rar: {
    Icon: FaFileZipper,
    colorClassName: 'text-amber-600',
    label: 'RAR',
  },
  '7z': {
    Icon: FaFileZipper,
    colorClassName: 'text-amber-600',
    label: '7Z',
  },
  json: {
    Icon: FaFileCode,
    colorClassName: 'text-indigo-500',
    label: 'JSON',
  },
  xml: {
    Icon: FaFileCode,
    colorClassName: 'text-indigo-500',
    label: 'XML',
  },
};

function getDocumentVisual(
  message: Pick<
    MediaRendererProps['message'],
    'mediaFilename' | 'mediaMimeType'
  >,
): DocumentVisual {
  const extension = getDocumentExtension(message);

  if (extension && documentVisuals[extension]) {
    return documentVisuals[extension];
  }

  const mimeType = message.mediaMimeType?.toLowerCase() ?? '';

  if (mimeType.startsWith('image/')) {
    return {
      Icon: FaFileImage,
      colorClassName: 'text-violet-500',
      label: extension?.toUpperCase() ?? 'IMAGE',
    };
  }

  if (mimeType.startsWith('audio/')) {
    return {
      Icon: FaFileAudio,
      colorClassName: 'text-pink-500',
      label: extension?.toUpperCase() ?? 'AUDIO',
    };
  }

  if (mimeType.startsWith('video/')) {
    return {
      Icon: FaFileVideo,
      colorClassName: 'text-cyan-600',
      label: extension?.toUpperCase() ?? 'VIDEO',
    };
  }

  return {
    Icon: extension ? FaFile : FaFileLines,
    colorClassName: 'text-slate-500',
    label: extension?.toUpperCase() ?? 'FILE',
  };
}

function DocumentMessage({
  downloadUrl,
  getFreshDownloadUrl,
  isDownloadUrlStale,
  message,
  metadata,
}: MediaRendererProps) {
  const openFromMessageMenu = useMessageOpen();
  const size = formatByteSize(message.mediaSize);
  const { Icon, colorClassName, label } = getDocumentVisual(message);
  const title = message.mediaFilename || 'Document';
  const description = [label, size].filter(Boolean).join(' · ');

  const handleOpenDocument = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (openFromMessageMenu) {
      event.preventDefault();
      openFromMessageMenu();
      return;
    }

    if (!isDownloadUrlStale || !getFreshDownloadUrl) {
      return;
    }

    event.preventDefault();
    const freshUrl = await getFreshDownloadUrl();
    window.open(freshUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-0.5 w-76 max-w-[calc(100vw-3rem)]">
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        onClick={handleOpenDocument}
        className="flex h-14 w-full items-center gap-2.5 bg-transparent px-2 text-sm"
      >
        <Icon className={`size-7 shrink-0 ${colorClassName}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-4 font-medium">
            {title}
          </span>
          <span className="mt-1 flex min-h-3 items-end justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-[10px] leading-none text-muted-foreground">
              <span className="truncate">{description}</span>
            </span>
            {!message.content ? metadata : null}
          </span>
        </span>
      </a>
      <MessageCaption content={message.content} metadata={metadata} />
    </div>
  );
}

export { DocumentMessage, getDocumentVisual };
