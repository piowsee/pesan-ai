'use client';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { LegalHero } from '@/components/legal/legal-hero';
import { LegalTableOfContents } from '@/components/legal/legal-table-of-contents';
import { useEffect, useState } from 'react';

import { TermsArticle, type TermsArticleCopy } from './terms-article';

type TermsSection = {
  id: string;
  label: string;
};

type TermsMainContentProps = {
  title: string;
  heroAlt: string;
  updatedLabel: string;
  updatedOn: string;
  tocTitle: string;
  sections: TermsSection[];
  articleCopy: TermsArticleCopy;
};

export function TermsMainContent({
  title,
  heroAlt,
  updatedLabel,
  updatedOn,
  tocTitle,
  sections,
  articleCopy,
}: TermsMainContentProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);

  useEffect(() => {
    setActiveSection(sections[0].id);
  }, [sections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleSections[0]) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: '-120px 0px -70% 0px',
        threshold: 0.15,
      },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <main className="min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      <LegalHero
        title={title}
        heroAlt={heroAlt}
        updatedLabel={updatedLabel}
        updatedOn={updatedOn}
      />

      <section className="flex justify-center px-6 py-20">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-14 md:grid-cols-[240px_1fr]">
          <LegalTableOfContents
            title={tocTitle}
            items={sections}
            activeSection={activeSection}
          />
          <TermsArticle copy={articleCopy} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
