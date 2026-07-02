function UnsupportedMessage({ type }: { type: string }) {
  return (
    <div className="whitespace-pre-wrap wrap-anywhere text-[15px] leading-relaxed text-muted-foreground">
      Unsupported {type} message
    </div>
  );
}

export { UnsupportedMessage };
