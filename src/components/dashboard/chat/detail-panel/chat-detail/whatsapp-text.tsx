import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type WhatsAppTextBlock =
  | { kind: 'blank' }
  | { kind: 'code'; content: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'quote'; lines: string[] };

export type WhatsAppTextFormat =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'inline-code'
  | 'bulleted-list'
  | 'numbered-list'
  | 'quote'
  | 'url';

type ApplyWhatsAppTextFormatInput = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  format: WhatsAppTextFormat;
};

type ApplyWhatsAppTextFormatResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const urlPattern = /(?:https?:\/\/|www\.)[^\s<]+/gi;
const formattingPattern =
  /(^|\n)\s*(?:[-*]\s+|\d{1,2}\.\s+|>\s+)|(?:https?:\/\/|www\.)\S+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`|```[\s\S]+```/;

const inlineFormatRules = [
  { type: 'monospace', marker: '```' },
  { type: 'code', marker: '`' },
  { type: 'bold', marker: '*' },
  { type: 'italic', marker: '_' },
  { type: 'strikethrough', marker: '~' },
] as const;

function trimUrlPunctuation(url: string) {
  let cleanUrl = url;
  let trailingText = '';

  while (/[.,!?;:]$/.test(cleanUrl)) {
    trailingText = `${cleanUrl.at(-1)}${trailingText}`;
    cleanUrl = cleanUrl.slice(0, -1);
  }

  while (
    cleanUrl.endsWith(')') &&
    cleanUrl.split('(').length <= cleanUrl.split(')').length
  ) {
    trailingText = `)${trailingText}`;
    cleanUrl = cleanUrl.slice(0, -1);
  }

  return { cleanUrl, trailingText };
}

function renderPlainTextWithLinks(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    const { cleanUrl, trailingText } = trimUrlPunctuation(rawUrl);
    const href = cleanUrl.toLowerCase().startsWith('www.')
      ? `https://${cleanUrl}`
      : cleanUrl;

    nodes.push(
      <a
        key={`${keyPrefix}-url-${matchIndex}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-brand underline decoration-current/35 underline-offset-2 transition hover:decoration-current"
      >
        {cleanUrl}
      </a>,
    );

    if (trailingText) {
      nodes.push(trailingText);
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderFormattingMarker(marker: string, key: string) {
  return (
    <span key={key} className="font-medium text-brand/70">
      {marker}
    </span>
  );
}

export function findInlineFormat(text: string) {
  let bestMatch: {
    end: number;
    marker: string;
    start: number;
    type: (typeof inlineFormatRules)[number]['type'];
  } | null = null;

  for (const rule of inlineFormatRules) {
    let searchIndex = 0;

    while (searchIndex < text.length) {
      const start = text.indexOf(rule.marker, searchIndex);
      if (start === -1) {
        break;
      }

      const contentStart = start + rule.marker.length;
      const end = text.indexOf(rule.marker, contentStart);
      if (end === -1) {
        break;
      }

      const content = text.slice(contentStart, end);
      if (!content.trim()) {
        searchIndex = contentStart;
        continue;
      }

      if (
        !bestMatch ||
        start < bestMatch.start ||
        (start === bestMatch.start &&
          rule.marker.length > bestMatch.marker.length)
      ) {
        bestMatch = {
          end,
          marker: rule.marker,
          start,
          type: rule.type,
        };
      }

      break;
    }
  }

  return bestMatch;
}

export function hasUnbalancedFormattingMarker(text: string) {
  return ['*', '_', '~', '`'].some((marker) => {
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = text.match(new RegExp(escapedMarker, 'g')) ?? [];

    return matches.length % 2 === 1;
  });
}

function renderInlineText(
  text: string,
  keyPrefix: string,
  trailingSpacerClassName?: string,
  showFormattingMarkers = false,
) {
  const nodes: ReactNode[] = [];
  let remainingText = text;
  let offset = 0;

  if (showFormattingMarkers && hasUnbalancedFormattingMarker(text)) {
    nodes.push(...renderPlainTextWithLinks(text, `${keyPrefix}-plain`));

    if (trailingSpacerClassName) {
      nodes.push(
        <span
          key={`${keyPrefix}-metadata-spacer`}
          className={cn('inline-block h-1', trailingSpacerClassName)}
        />,
      );
    }

    return nodes;
  }

  while (remainingText) {
    const match = findInlineFormat(remainingText);

    if (!match) {
      nodes.push(
        ...renderPlainTextWithLinks(remainingText, `${keyPrefix}-${offset}`),
      );
      break;
    }

    if (match.start > 0) {
      nodes.push(
        ...renderPlainTextWithLinks(
          remainingText.slice(0, match.start),
          `${keyPrefix}-${offset}`,
        ),
      );
    }

    const contentStart = match.start + match.marker.length;
    const content = remainingText.slice(contentStart, match.end);
    const formatKey = `${keyPrefix}-${offset}-${match.type}`;

    if (showFormattingMarkers) {
      nodes.push(renderFormattingMarker(match.marker, `${formatKey}-start`));
    }

    if (match.type === 'bold') {
      nodes.push(
        <strong key={formatKey} className="font-semibold">
          {renderInlineText(
            content,
            formatKey,
            undefined,
            showFormattingMarkers,
          )}
        </strong>,
      );
    } else if (match.type === 'italic') {
      nodes.push(
        <em key={formatKey} className="italic">
          {renderInlineText(
            content,
            formatKey,
            undefined,
            showFormattingMarkers,
          )}
        </em>,
      );
    } else if (match.type === 'strikethrough') {
      nodes.push(
        <del key={formatKey} className="line-through">
          {renderInlineText(
            content,
            formatKey,
            undefined,
            showFormattingMarkers,
          )}
        </del>,
      );
    } else {
      nodes.push(
        <code
          key={formatKey}
          className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.92em]"
        >
          {content}
        </code>,
      );
    }

    if (showFormattingMarkers) {
      nodes.push(renderFormattingMarker(match.marker, `${formatKey}-end`));
    }

    const nextIndex = match.end + match.marker.length;
    offset += nextIndex;
    remainingText = remainingText.slice(nextIndex);
  }

  if (trailingSpacerClassName) {
    nodes.push(
      <span
        key={`${keyPrefix}-metadata-spacer`}
        className={cn('inline-block h-1', trailingSpacerClassName)}
      />,
    );
  }

  return nodes;
}

function isCodeFenceStart(line: string) {
  return line.trimStart().startsWith('```');
}

function isBulletLine(line: string) {
  return /^\s{0,3}[-*]\s+/.test(line);
}

function isNumberedLine(line: string) {
  return /^\s{0,3}\d{1,2}\.\s+/.test(line);
}

function isQuoteLine(line: string) {
  return /^\s{0,3}>\s+/.test(line);
}

function parseWhatsAppTextBlocks(content: string) {
  const blocks: WhatsAppTextBlock[] = [];
  const lines = content.split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (!line.trim()) {
      blocks.push({ kind: 'blank' });
      index += 1;
      continue;
    }

    if (isCodeFenceStart(line)) {
      const codeLines: string[] = [];
      const firstLine = line.trimStart().slice(3);

      if (firstLine.endsWith('```') && firstLine.length > 3) {
        codeLines.push(firstLine.slice(0, -3));
        index += 1;
      } else {
        if (firstLine) {
          codeLines.push(firstLine);
        }

        index += 1;
        while (index < lines.length) {
          const codeLine = lines[index] ?? '';
          if (codeLine.trimEnd().endsWith('```')) {
            codeLines.push(codeLine.trimEnd().slice(0, -3));
            index += 1;
            break;
          }

          codeLines.push(codeLine);
          index += 1;
        }
      }

      blocks.push({ kind: 'code', content: codeLines.join('\n') });
      continue;
    }

    if (isBulletLine(line) || isNumberedLine(line)) {
      const ordered = isNumberedLine(line);
      const items: string[] = [];

      while (
        index < lines.length &&
        (ordered
          ? isNumberedLine(lines[index] ?? '')
          : isBulletLine(lines[index] ?? ''))
      ) {
        items.push(
          (lines[index] ?? '').replace(
            ordered ? /^\s{0,3}\d{1,2}\.\s+/ : /^\s{0,3}[-*]\s+/,
            '',
          ),
        );
        index += 1;
      }

      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    if (isQuoteLine(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && isQuoteLine(lines[index] ?? '')) {
        quoteLines.push((lines[index] ?? '').replace(/^\s{0,3}>\s+/, ''));
        index += 1;
      }

      blocks.push({ kind: 'quote', lines: quoteLines });
      continue;
    }

    const paragraphLines: string[] = [];

    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !isCodeFenceStart(lines[index] ?? '') &&
      !isBulletLine(lines[index] ?? '') &&
      !isNumberedLine(lines[index] ?? '') &&
      !isQuoteLine(lines[index] ?? '')
    ) {
      paragraphLines.push(lines[index] ?? '');
      index += 1;
    }

    blocks.push({ kind: 'paragraph', lines: paragraphLines });
  }

  return blocks;
}

function renderJoinedLines(
  lines: string[],
  keyPrefix: string,
  trailingSpacerClassName?: string,
  showFormattingMarkers = false,
) {
  return lines.flatMap((line, index) => {
    const isLastLine = index === lines.length - 1;
    const nodes = renderInlineText(
      line,
      `${keyPrefix}-line-${index}`,
      isLastLine ? trailingSpacerClassName : undefined,
      showFormattingMarkers,
    );

    return isLastLine
      ? nodes
      : [...nodes, <br key={`${keyPrefix}-line-${index}-break`} />];
  });
}

function renderBlock(
  block: WhatsAppTextBlock,
  index: number,
  isLastContentBlock: boolean,
  trailingSpacerClassName?: string,
  showFormattingMarkers = false,
) {
  const spacerClassName = isLastContentBlock
    ? trailingSpacerClassName
    : undefined;

  if (block.kind === 'blank') {
    return <div key={index} className="h-2" aria-hidden="true" />;
  }

  if (block.kind === 'paragraph') {
    return (
      <p key={index} className="whitespace-pre-wrap">
        {renderJoinedLines(
          block.lines,
          `paragraph-${index}`,
          spacerClassName,
          showFormattingMarkers,
        )}
      </p>
    );
  }

  if (block.kind === 'quote') {
    return (
      <blockquote
        key={index}
        className={cn(
          'text-foreground/80',
          showFormattingMarkers
            ? 'border-0 pl-0'
            : 'border-l-2 border-current/30 pl-2',
        )}
      >
        {block.lines.map((line, lineIndex) => {
          const isLastLine = lineIndex === block.lines.length - 1;

          return (
            <span key={lineIndex}>
              {showFormattingMarkers
                ? renderFormattingMarker('> ', `quote-${index}-${lineIndex}`)
                : null}
              {renderInlineText(
                line,
                `quote-${index}-${lineIndex}`,
                isLastLine ? spacerClassName : undefined,
                showFormattingMarkers,
              )}
              {isLastLine ? null : <br />}
            </span>
          );
        })}
      </blockquote>
    );
  }

  if (block.kind === 'code') {
    return (
      <pre
        key={index}
        className="overflow-x-auto rounded-md bg-foreground/10 px-2 py-1.5 font-mono text-[0.92em] leading-snug"
      >
        {showFormattingMarkers
          ? renderFormattingMarker('```', `code-${index}-start`)
          : null}
        <code>{block.content}</code>
        {showFormattingMarkers
          ? renderFormattingMarker('```', `code-${index}-end`)
          : null}
        {spacerClassName ? (
          <span className={cn('inline-block h-1', spacerClassName)} />
        ) : null}
      </pre>
    );
  }

  const ListTag = block.ordered ? 'ol' : 'ul';

  return (
    <ListTag
      key={index}
      className={cn(
        'flex flex-col gap-0.5',
        showFormattingMarkers
          ? 'list-none pl-0'
          : cn('pl-5', block.ordered ? 'list-decimal' : 'list-disc'),
      )}
    >
      {block.items.map((item, itemIndex) => (
        <li key={itemIndex}>
          {showFormattingMarkers
            ? renderFormattingMarker(
                block.ordered ? `${itemIndex + 1}. ` : '- ',
                `list-${index}-${itemIndex}-marker`,
              )
            : null}
          {renderInlineText(
            item,
            `list-${index}-${itemIndex}`,
            itemIndex === block.items.length - 1 ? spacerClassName : undefined,
            showFormattingMarkers,
          )}
        </li>
      ))}
    </ListTag>
  );
}

function getLastContentBlockIndex(blocks: WhatsAppTextBlock[]) {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index]?.kind !== 'blank') {
      return index;
    }
  }

  return -1;
}

export function hasWhatsAppTextFormatting(content: string) {
  return formattingPattern.test(content);
}

export function WhatsAppText({
  className,
  content,
  showFormattingMarkers = false,
  trailingSpacerClassName,
}: {
  className?: string;
  content: string;
  showFormattingMarkers?: boolean;
  trailingSpacerClassName?: string;
}) {
  const blocks = parseWhatsAppTextBlocks(content);
  const lastContentBlockIndex = getLastContentBlockIndex(blocks);

  return (
    <div
      data-wa-root=""
      className={cn(
        'flex flex-col gap-1 wrap-anywhere text-[14px] leading-relaxed',
        className,
      )}
    >
      {blocks.map((block, index) =>
        renderBlock(
          block,
          index,
          index === lastContentBlockIndex,
          trailingSpacerClassName,
          showFormattingMarkers,
        ),
      )}
    </div>
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineTextToHtml(text: string, showMarkers: boolean): string {
  if (showMarkers && hasUnbalancedFormattingMarker(text)) {
    return escapeHtml(text);
  }

  let result = '';
  let remaining = text;

  while (remaining) {
    const match = findInlineFormat(remaining);

    if (!match) {
      result += escapeHtml(remaining);
      break;
    }

    if (match.start > 0) {
      result += escapeHtml(remaining.slice(0, match.start));
    }

    const content = remaining.slice(
      match.start + match.marker.length,
      match.end,
    );
    const markerHtml = showMarkers
      ? `<span class="font-medium text-brand/70">${escapeHtml(match.marker)}</span>`
      : '';

    const innerHtml = renderInlineTextToHtml(content, showMarkers);

    if (match.type === 'bold') {
      result += `${markerHtml}<strong class="font-semibold">${innerHtml}</strong>${markerHtml}`;
    } else if (match.type === 'italic') {
      result += `${markerHtml}<em class="italic">${innerHtml}</em>${markerHtml}`;
    } else if (match.type === 'strikethrough') {
      result += `${markerHtml}<del class="line-through">${innerHtml}</del>${markerHtml}`;
    } else {
      result += `${markerHtml}<code class="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.92em]">${escapeHtml(content)}</code>${markerHtml}`;
    }

    remaining = remaining.slice(match.end + match.marker.length);
  }

  return result;
}

function renderBlocksToHtml(
  blocks: WhatsAppTextBlock[],
  showMarkers: boolean,
): string {
  return blocks
    .map((block) => {
      if (block.kind === 'blank') {
        return '<br>';
      }

      if (block.kind === 'paragraph') {
        return block.lines
          .map((line) => renderInlineTextToHtml(line, showMarkers))
          .join('<br>');
      }

      if (block.kind === 'quote') {
        const inner = block.lines
          .map((line) => {
            const prefix = showMarkers
              ? '<span class="font-medium text-brand/70">&gt; </span>'
              : '';
            return `${prefix}${renderInlineTextToHtml(line, showMarkers)}`;
          })
          .join('<br>');

        if (showMarkers) {
          return inner;
        }

        return `<blockquote class="border-l-2 border-current/30 pl-2 text-foreground/80">${inner}</blockquote>`;
      }

      if (block.kind === 'code') {
        const marker = showMarkers
          ? '<span class="font-medium text-brand/70">```</span>'
          : '';
        return `<pre class="overflow-x-auto rounded-md bg-foreground/10 px-2 py-1.5 font-mono text-[0.92em] leading-snug">${marker}<code>${escapeHtml(block.content)}</code>${marker}</pre>`;
      }

      // list
      return block.items
        .map((item, i) => {
          const prefix = showMarkers
            ? `<span class="font-medium text-brand/70">${block.ordered ? `${i + 1}. ` : '- '}</span>`
            : '';
          return `${prefix}${renderInlineTextToHtml(item, showMarkers)}`;
        })
        .join('<br>');
    })
    .join('\n');
}

export function renderWhatsAppHTML(
  content: string,
  showMarkers = true,
): string {
  if (!content) return '';
  const blocks = parseWhatsAppTextBlocks(content);
  return renderBlocksToHtml(blocks, showMarkers);
}

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix = prefix,
): ApplyWhatsAppTextFormatResult {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const nextValue = `${value.slice(0, selectionStart)}${prefix}${selectedText}${suffix}${value.slice(selectionEnd)}`;
  const nextSelectionStart = selectionStart + prefix.length;
  const nextSelectionEnd = nextSelectionStart + selectedText.length;

  return {
    value: nextValue,
    selectionStart: nextSelectionStart,
    selectionEnd: nextSelectionEnd,
  };
}

function getLineSelectionRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const lineStart =
    value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const lineEndCandidate = value.indexOf(
    '\n',
    Math.max(selectionStart, selectionEnd),
  );
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;

  return { lineStart, lineEnd };
}

function stripLeadingBlockMarker(line: string) {
  return line.replace(/^\s{0,3}(?:[-*]|\d{1,2}\.|>)\s+/, '');
}

function prefixSelectedLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  getPrefix: (index: number) => string,
): ApplyWhatsAppTextFormatResult {
  const { lineStart, lineEnd } = getLineSelectionRange(
    value,
    selectionStart,
    selectionEnd,
  );
  const selectedLines = value.slice(lineStart, lineEnd).split('\n');
  const nextSegment = selectedLines
    .map((line, index) => `${getPrefix(index)}${stripLeadingBlockMarker(line)}`)
    .join('\n');
  const nextValue = `${value.slice(0, lineStart)}${nextSegment}${value.slice(lineEnd)}`;
  const nextCursor = lineStart + nextSegment.length;

  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

function applyUrlFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ApplyWhatsAppTextFormatResult {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const trimmedSelectedText = selectedText.trim();

  if (!trimmedSelectedText) {
    const urlPlaceholder = 'https://';
    const nextValue = `${value.slice(0, selectionStart)}${urlPlaceholder}${value.slice(selectionEnd)}`;
    const nextCursor = selectionStart + urlPlaceholder.length;

    return {
      value: nextValue,
      selectionStart: nextCursor,
      selectionEnd: nextCursor,
    };
  }

  if (/^(?:https?:\/\/|www\.)\S+$/i.test(trimmedSelectedText)) {
    return { value, selectionStart, selectionEnd };
  }

  if (!/\s/.test(trimmedSelectedText)) {
    const replacement = `https://${trimmedSelectedText.replace(/^\/+/, '')}`;
    const leadingWhitespaceLength =
      selectedText.length - selectedText.trimStart().length;
    const replacementStart = selectionStart + leadingWhitespaceLength;
    const replacementEnd = replacementStart + trimmedSelectedText.length;
    const nextValue = `${value.slice(0, replacementStart)}${replacement}${value.slice(replacementEnd)}`;

    return {
      value: nextValue,
      selectionStart: replacementStart,
      selectionEnd: replacementStart + replacement.length,
    };
  }

  const insertion = ' https://';
  const nextValue = `${value.slice(0, selectionEnd)}${insertion}${value.slice(selectionEnd)}`;
  const nextCursor = selectionEnd + insertion.length;

  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

export function applyWhatsAppTextFormat({
  format,
  selectionEnd,
  selectionStart,
  value,
}: ApplyWhatsAppTextFormatInput): ApplyWhatsAppTextFormatResult {
  if (format === 'bold') {
    return wrapSelection(value, selectionStart, selectionEnd, '*');
  }

  if (format === 'italic') {
    return wrapSelection(value, selectionStart, selectionEnd, '_');
  }

  if (format === 'strikethrough') {
    return wrapSelection(value, selectionStart, selectionEnd, '~');
  }

  if (format === 'inline-code') {
    return wrapSelection(value, selectionStart, selectionEnd, '`');
  }

  if (format === 'bulleted-list') {
    return prefixSelectedLines(value, selectionStart, selectionEnd, () => '- ');
  }

  if (format === 'numbered-list') {
    return prefixSelectedLines(
      value,
      selectionStart,
      selectionEnd,
      (index) => `${index + 1}. `,
    );
  }

  if (format === 'quote') {
    return prefixSelectedLines(value, selectionStart, selectionEnd, () => '> ');
  }

  return applyUrlFormat(value, selectionStart, selectionEnd);
}
