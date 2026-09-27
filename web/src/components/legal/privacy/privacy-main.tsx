import { useTranslations } from 'next-intl';

import { type PrivacyArticleCopy } from './privacy-article';
import { PrivacyMainContent } from './privacy-main-content';

type PrivacySection = {
  id: string;
  label: string;
};

type CollectionItem = {
  label: string;
  value: string;
};

export function PrivacyMain() {
  const t = useTranslations('PrivacyPage');
  const sections = t.raw('sections') as PrivacySection[];

  const articleCopy: PrivacyArticleCopy = {
    introductionHeading: t('introductionHeading'),
    introductionText: t('introductionText'),
    collectionHeading: t('collectionHeading'),
    collectionIntro: t('collectionIntro'),
    collectionItems: t.raw('collectionItems') as CollectionItem[],
    usageHeading: t('usageHeading'),
    usageIntro: t('usageIntro'),
    usageItems: t.raw('usageItems') as string[],
    securityHeading: t('securityHeading'),
    securityText: t('securityText'),
    contactHeading: t('contactHeading'),
    contactText: t('contactText'),
  };

  return (
    <PrivacyMainContent
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
