type CollectionItem = {
  label: string;
  value: string;
};

export type PrivacyArticleCopy = {
  introductionHeading: string;
  introductionText: string;
  collectionHeading: string;
  collectionIntro: string;
  collectionItems: CollectionItem[];
  usageHeading: string;
  usageIntro: string;
  usageItems: string[];
  securityHeading: string;
  securityText: string;
  contactHeading: string;
  contactText: string;
};

type Props = {
  copy: PrivacyArticleCopy;
};

export function PrivacyArticle({ copy }: Props) {
  return (
    <div className="prose prose-zinc max-w-none lg:prose-lg">
      <h2
        id="introduction"
        className="scroll-mt-25 mt-0 mb-4 text-2xl font-bold text-zinc-900"
      >
        {copy.introductionHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">
        {copy.introductionText}
      </p>

      <h2
        id="data-collection"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.collectionHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">
        {copy.collectionIntro}
      </p>

      <ul className="mb-6 list-disc space-y-2 pl-6 text-zinc-600">
        {copy.collectionItems.map((item) => (
          <li key={item.label}>
            <strong>{item.label}</strong> {item.value}
          </li>
        ))}
      </ul>

      <h2
        id="data-use"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.usageHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.usageIntro}</p>

      <ul className="mb-6 list-disc space-y-2 pl-6 text-zinc-600">
        {copy.usageItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2
        id="security"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.securityHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.securityText}</p>

      <h2
        id="contact"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.contactHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.contactText}</p>
    </div>
  );
}
