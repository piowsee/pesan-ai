import type { WhatsAppTextFormat } from '../../whatsapp-text';

export type TextareaEdit = {
  replacement: string;
  start: number;
  end: number;
  selectionStart: number;
  selectionEnd: number;
};

const inlineMarkerByFormat: Partial<Record<WhatsAppTextFormat, string>> = {
  bold: '*',
  italic: '_',
  strikethrough: '~',
  'inline-code': '`',
};

const inlineMarkers = Object.values(inlineMarkerByFormat);

export function getCurrentLine(value: string, cursor: number) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  const lineEndCandidate = value.indexOf('\n', cursor);
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;

  return {
    line: value.slice(lineStart, lineEnd),
    lineStart,
    lineEnd,
  };
}

export function getContinuedLinePrefix(line: string) {
  const bulletMatch = /^(\s{0,3})([-*])\s+(.*)$/.exec(line);
  if (bulletMatch) {
    return bulletMatch[3]?.trim() ? `${bulletMatch[1]}${bulletMatch[2]} ` : '';
  }

  const numberedMatch = /^(\s{0,3})(\d{1,2})\.\s+(.*)$/.exec(line);
  if (numberedMatch) {
    const nextNumber = Number(numberedMatch[2]) + 1;
    return numberedMatch[3]?.trim() ? `${numberedMatch[1]}${nextNumber}. ` : '';
  }

  const quoteMatch = /^(\s{0,3}>\s+)(.*)$/.exec(line);
  if (quoteMatch) {
    return quoteMatch[2]?.trim() ? quoteMatch[1] : '';
  }

  return null;
}

function peelInlineMarkers(text: string, targetMarker: string) {
  let stripped = text;
  let peeledPrefix = '';
  let peeledSuffix = '';
  let hasTargetMarker = false;
  let changed = true;

  while (changed) {
    changed = false;
    for (const marker of inlineMarkers) {
      if (
        stripped.length >= 2 &&
        stripped.startsWith(marker) &&
        stripped.endsWith(marker)
      ) {
        if (marker === targetMarker) {
          hasTargetMarker = true;
        } else {
          peeledPrefix += marker;
          peeledSuffix = marker + peeledSuffix;
        }
        stripped = stripped.slice(marker.length, -marker.length);
        changed = true;
      }
    }
  }

  return { hasTargetMarker, peeledPrefix, peeledSuffix, stripped };
}

export function getActiveFormats(
  value: string,
  cursorStart: number,
  cursorEnd: number,
) {
  const active = new Set<WhatsAppTextFormat>();
  if (!value) return active;

  const selectedText = value.slice(cursorStart, cursorEnd);

  const checkInline = (marker: string, format: WhatsAppTextFormat) => {
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursorStart - 1)) + 1;
    const lineEndCandidate = value.indexOf('\n', cursorEnd);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
    const beforeText = value.slice(lineStart, cursorStart);
    const afterText = value.slice(cursorEnd, lineEnd);
    const beforeCount = beforeText.split(marker).length - 1;
    const afterCount = afterText.split(marker).length - 1;
    const { hasTargetMarker } = peelInlineMarkers(selectedText, marker);

    if ((beforeCount % 2 === 1 && afterCount % 2 === 1) || hasTargetMarker) {
      active.add(format);
    }
  };

  checkInline('*', 'bold');
  checkInline('_', 'italic');
  checkInline('~', 'strikethrough');
  checkInline('`', 'inline-code');

  const targetStart = value.lastIndexOf('\n', Math.max(0, cursorStart - 1)) + 1;
  const nextNewlineIndex = value.indexOf('\n', cursorEnd);
  const targetEnd = nextNewlineIndex === -1 ? value.length : nextNewlineIndex;
  const selectedLines = value.slice(targetStart, targetEnd).split('\n');

  if (
    selectedLines.length > 0 &&
    selectedLines.every((line) => /^\s{0,3}[-*]\s+/.test(line))
  ) {
    active.add('bulleted-list');
  }
  if (
    selectedLines.length > 0 &&
    selectedLines.every((line) => /^\s{0,3}\d{1,2}\.\s+/.test(line))
  ) {
    active.add('numbered-list');
  }
  if (
    selectedLines.length > 0 &&
    selectedLines.every((line) => /^\s{0,3}>\s+/.test(line))
  ) {
    active.add('quote');
  }

  return active;
}

function createBlockFormatEdit({
  value,
  start,
  end,
  format,
}: {
  value: string;
  start: number;
  end: number;
  format: WhatsAppTextFormat;
}): TextareaEdit {
  const targetStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextNewlineIndex = value.indexOf('\n', end);
  const targetEnd = nextNewlineIndex === -1 ? value.length : nextNewlineIndex;
  const rawLinesText = value.slice(targetStart, targetEnd);
  const lines = rawLinesText.split('\n');

  const modifiedLines = lines.map((line, index) => {
    const bullet = /^(\s{0,3})([-*])\s+/.exec(line);
    const numbered = /^(\s{0,3})(\d{1,2}\.)\s+/.exec(line);
    const quote = /^(\s{0,3})>\s+/.exec(line);
    const currentPrefix = bullet
      ? 'bullet'
      : numbered
        ? 'numbered'
        : quote
          ? 'quote'
          : null;
    const matchedPrefix = bullet ?? numbered ?? quote;
    const content = matchedPrefix ? line.slice(matchedPrefix[0].length) : line;

    if (format === 'bulleted-list') {
      return currentPrefix === 'bullet' ? content : `- ${content}`;
    }
    if (format === 'numbered-list') {
      return currentPrefix === 'numbered'
        ? content
        : `${index + 1}. ${content}`;
    }
    return currentPrefix === 'quote' ? content : `> ${content}`;
  });

  const replacement = modifiedLines.join('\n');
  const firstLineDiff = modifiedLines[0].length - lines[0].length;
  const totalDiff = replacement.length - rawLinesText.length;
  const selectionStart = Math.max(targetStart, start + firstLineDiff);
  const selectionEnd = Math.max(selectionStart, end + totalDiff);

  return {
    replacement,
    start: targetStart,
    end: targetEnd,
    selectionStart,
    selectionEnd,
  };
}

function createInlineFormatEdit({
  value,
  start,
  end,
  marker,
}: {
  value: string;
  start: number;
  end: number;
  marker: string;
}): TextareaEdit {
  const selectedText = value.slice(start, end);
  const { hasTargetMarker, peeledPrefix, peeledSuffix, stripped } =
    peelInlineMarkers(selectedText, marker);

  if (hasTargetMarker) {
    const replacement = peeledPrefix + stripped + peeledSuffix;
    return {
      replacement,
      start,
      end,
      selectionStart: start,
      selectionEnd: start + replacement.length,
    };
  }

  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndCandidate = value.indexOf('\n', end);
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
  const beforeText = value.slice(lineStart, start);
  const afterText = value.slice(end, lineEnd);
  const isInsideExistingMarkers =
    (beforeText.split(marker).length - 1) % 2 === 1 &&
    (afterText.split(marker).length - 1) % 2 === 1;

  if (isInsideExistingMarkers) {
    const beforeMarkerIndex = value.lastIndexOf(marker, start - 1);
    const afterMarkerIndex = value.indexOf(marker, end);
    return {
      replacement:
        value.slice(beforeMarkerIndex + marker.length, start) +
        selectedText +
        value.slice(end, afterMarkerIndex),
      start: beforeMarkerIndex,
      end: afterMarkerIndex + marker.length,
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    };
  }

  const replacement = `${marker}${selectedText}${marker}`;
  return {
    replacement,
    start,
    end,
    selectionStart: start + marker.length,
    selectionEnd:
      selectedText.length > 0
        ? start + marker.length + selectedText.length
        : start + marker.length,
  };
}

export function createTextFormatEdit({
  value,
  start,
  end,
  format,
}: {
  value: string;
  start: number;
  end: number;
  format: WhatsAppTextFormat;
}) {
  if (
    format === 'bulleted-list' ||
    format === 'numbered-list' ||
    format === 'quote'
  ) {
    return createBlockFormatEdit({ value, start, end, format });
  }

  const marker = inlineMarkerByFormat[format];
  return marker ? createInlineFormatEdit({ value, start, end, marker }) : null;
}
