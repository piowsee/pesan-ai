export const MAX_MEDIA_FILES = 10;

const documentMimeTypes = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

const photoVideoMimeTypes = [
  'image/jpeg',
  'image/png',
  'video/3gpp',
  'video/mp4',
] as const;

const audioMimeTypes = [
  'audio/aac',
  'audio/amr',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
] as const;

export const mediaAccept = {
  audio: audioMimeTypes.join(','),
  document: documentMimeTypes.join(','),
  'photo-video': photoVideoMimeTypes.join(','),
} as const;

export const supportedMediaMimeTypes = new Set<string>([
  ...documentMimeTypes,
  ...photoVideoMimeTypes,
  ...audioMimeTypes,
]);

export const mediaMimeTypeByExtension: Record<string, string> = {
  '.3gp': 'video/3gpp',
  '.aac': 'audio/aac',
  '.amr': 'audio/amr',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const defaultPastedFileNameByMimeType: Record<string, string> = {
  'image/jpeg': 'pasted-image.jpg',
  'image/png': 'pasted-image.png',
  'video/3gpp': 'pasted-video.3gp',
  'video/mp4': 'pasted-video.mp4',
  'audio/aac': 'pasted-audio.aac',
  'audio/amr': 'pasted-audio.amr',
  'audio/mpeg': 'pasted-audio.mp3',
  'audio/mp4': 'pasted-audio.m4a',
  'audio/ogg': 'pasted-audio.ogg',
  'text/plain': 'pasted-document.txt',
  'application/pdf': 'pasted-document.pdf',
  'application/msword': 'pasted-document.doc',
  'application/vnd.ms-excel': 'pasted-document.xls',
  'application/vnd.ms-powerpoint': 'pasted-document.ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'pasted-document.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'pasted-document.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pasted-document.pptx',
};
