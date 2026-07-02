import { Spinner } from '@/components/ui/spinner';
import { FileTextIcon } from 'lucide-react';

import { MessageCaption } from './message-caption';
import { formatByteSize } from './message-utils';
import type { MediaRendererProps } from './types';

const documentTypeByMimeType: Record<string, string> = {
  'application/msword': 'DOC',
  'application/pdf': 'PDF',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PPTX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
  'text/plain': 'TXT',
};

function getDocumentType({
  mediaFilename,
  mediaMimeType,
}: Pick<MediaRendererProps['message'], 'mediaFilename' | 'mediaMimeType'>) {
  const fileExtension = mediaFilename?.split('.').pop()?.trim();

  if (fileExtension && fileExtension !== mediaFilename) {
    return fileExtension.toUpperCase();
  }

  const mimeType = mediaMimeType?.split(';')[0]?.trim().toLowerCase();

  return mimeType ? (documentTypeByMimeType[mimeType] ?? null) : null;
}

function DocumentMessage({ downloadUrl, message }: MediaRendererProps) {
  const size = formatByteSize(message.mediaSize);
  const documentType = getDocumentType(message);
  const title = message.mediaFilename || 'Document';
  const description = [size, documentType].filter(Boolean).join(' · ');
  const isSending = message.status === 'sending';

  return (
    <div className="flex flex-col gap-2">
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        download={message.mediaFilename || undefined}
        className="flex min-w-60 items-center gap-3 rounded-xl bg-background/50 p-3 text-sm transition-colors hover:bg-background/70"
      >
        <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          {description || isSending ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {description ? (
                <span className="truncate">{description}</span>
              ) : null}
              {isSending ? <Spinner className="size-3" /> : null}
            </span>
          ) : null}
        </span>
      </a>
      <MessageCaption content={message.content} />
    </div>
  );
}

export { DocumentMessage };
