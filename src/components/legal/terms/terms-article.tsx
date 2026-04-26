import type { TermsContent } from './content';

type Props = {
  copy: TermsContent;
};

export function TermsArticle({ copy }: Props) {
  return (
    <div className="prose prose-zinc max-w-none lg:prose-lg">
      <h2
        id="acceptance"
        className="mt-0 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.acceptanceHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">
        {copy.acceptanceText}
      </p>

      <h2
        id="service"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.serviceHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.serviceText}</p>

      <h2
        id="ip"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.ipHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.ipText}</p>

      <h2
        id="obligations"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.obligationsHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">
        {copy.obligationsIntro}
      </p>

      <ul className="mb-6 list-disc space-y-2 pl-6 text-zinc-600">
        {copy.obligationsItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2
        id="liability"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.liabilityHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.liabilityText}</p>

      <h2
        id="law"
        className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
      >
        {copy.lawHeading}
      </h2>

      <p className="mb-6 leading-relaxed text-zinc-600">{copy.lawText}</p>
    </div>
  );
}
