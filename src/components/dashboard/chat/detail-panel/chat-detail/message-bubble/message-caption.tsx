function MessageCaption({ content }: { content: string | null }) {
  if (!content) {
    return null;
  }

  return (
    <p className="whitespace-pre-wrap wrap-anywhere text-[15px] leading-relaxed">
      {content}
    </p>
  );
}

export { MessageCaption };
