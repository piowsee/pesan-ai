import { useTranslations } from 'next-intl';

function UnsupportedMessage({ type }: { type: string }) {
  const t = useTranslations('Chat.bubble');
  return (
    <div className="whitespace-pre-wrap wrap-anywhere text-[15px] leading-relaxed text-muted-foreground">
      {t('unsupported', { type })}
    </div>
  );
}

export { UnsupportedMessage };
