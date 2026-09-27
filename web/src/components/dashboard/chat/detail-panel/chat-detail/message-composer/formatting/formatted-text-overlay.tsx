import type { ReactNode, RefObject } from 'react';

import {
  findInlineFormat,
  hasUnbalancedFormattingMarker,
} from '../../whatsapp-text';

function renderInlineComposerText(
  text: string,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];

  if (hasUnbalancedFormattingMarker(text)) {
    return [text];
  }

  let remaining = text;
  let offset = 0;

  while (remaining) {
    const match = findInlineFormat(remaining);
    if (!match) {
      nodes.push(remaining);
      break;
    }

    if (match.start > 0) nodes.push(remaining.slice(0, match.start));

    const contentStart = match.start + match.marker.length;
    const content = remaining.slice(contentStart, match.end);
    const formatKey = `${keyPrefix}-${offset}-${match.type}`;
    const markerStart = (
      <span key={`${formatKey}-ms`} className="text-brand/70">
        {match.marker}
      </span>
    );
    const markerEnd = (
      <span key={`${formatKey}-me`} className="text-brand/70">
        {match.marker}
      </span>
    );
    const innerNodes = renderInlineComposerText(content, formatKey);

    nodes.push(markerStart);
    if (match.type === 'bold') {
      nodes.push(
        <span
          key={formatKey}
          className="text-foreground/90 font-normal"
          style={{
            textShadow: '0.4px 0 0 currentColor, -0.1px 0 0 currentColor',
          }}
        >
          {innerNodes}
        </span>,
      );
    } else if (match.type === 'italic') {
      nodes.push(
        <em key={formatKey} className="italic text-foreground/90">
          {innerNodes}
        </em>,
      );
    } else if (match.type === 'strikethrough') {
      nodes.push(
        <del key={formatKey} className="line-through text-foreground/70">
          {innerNodes}
        </del>,
      );
    } else {
      nodes.push(
        <span
          key={formatKey}
          className="rounded bg-foreground/10 text-brand font-normal"
        >
          {content}
        </span>,
      );
    }
    nodes.push(markerEnd);

    const nextIndex = match.end + match.marker.length;
    offset += nextIndex;
    remaining = remaining.slice(nextIndex);
  }

  return nodes;
}

function renderComposerLine(line: string, key: string) {
  const lineFormats = [
    { pattern: /^\s{0,3}>\s+/, fallback: '> ', suffix: 'quote' },
    { pattern: /^\s{0,3}[-*]\s+/, fallback: '- ', suffix: 'bullet' },
    {
      pattern: /^\s{0,3}\d{1,2}\.\s+/,
      fallback: '1. ',
      suffix: 'numbered',
    },
  ];

  for (const format of lineFormats) {
    const match = format.pattern.exec(line);
    if (!match) continue;

    const prefix = match[0] || format.fallback;
    return (
      <span key={key}>
        <span className="text-brand/75">{prefix}</span>
        {renderInlineComposerText(
          line.slice(prefix.length),
          `${key}-${format.suffix}`,
        )}
      </span>
    );
  }

  if (line.trimStart().startsWith('```')) {
    return (
      <span key={key} className="text-brand/75">
        {line}
      </span>
    );
  }

  return <span key={key}>{renderInlineComposerText(line, key)}</span>;
}

export function FormattedTextOverlay({
  draft,
  overlayRef,
}: {
  draft: string;
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  if (!draft) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap py-2.5 text-[15px] leading-tight wrap-break-word font-sans [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent"
    >
      {draft.split('\n').map((line, index, lines) => {
        const key = `co-${index}`;
        const renderedLine = renderComposerLine(line, key);

        return index === lines.length - 1 ? (
          renderedLine
        ) : (
          <span key={`${key}-wrapper`}>
            {renderedLine}
            {'\n'}
          </span>
        );
      })}
    </div>
  );
}
