import { useTranslations } from 'next-intl';

import { type TermsArticleCopy } from './terms-article';
import { TermsMainContent } from './terms-main-content';

type TermsSection = {
  id: string;
  label: string;
};

export function TermsMain() {
  const t = useTranslations('TermsPage');
  const sections = t.raw('sections') as TermsSection[];

  const articleCopy: TermsArticleCopy = {
    acceptanceHeading: t('acceptanceHeading'),
    acceptanceText: t('acceptanceText'),
    serviceHeading: t('serviceHeading'),
    serviceText: t('serviceText'),
    ipHeading: t('ipHeading'),
    ipText: t('ipText'),
    obligationsHeading: t('obligationsHeading'),
    obligationsIntro: t('obligationsIntro'),
    obligationsItems: t.raw('obligationsItems') as string[],
    liabilityHeading: t('liabilityHeading'),
    liabilityText: t('liabilityText'),
    lawHeading: t('lawHeading'),
    lawText: t('lawText'),
  };

  return (
    <TermsMainContent
      title={t('title')}
      heroAlt={t('heroAlt')}
      updatedLabel={t('updatedLabel')}
      updatedOn={t('updatedOn')}
      tocTitle={t('tocTitle')}
      sections={sections}
      articleCopy={articleCopy}
    />
  );
}
