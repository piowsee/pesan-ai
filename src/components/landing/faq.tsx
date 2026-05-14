'use client';

import { Container } from '@/components/Container';
import { ScrollReveal } from '@/components/ScrollReveal';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type FaqItem = {
  question: string;
  answer: string;
};

export function FAQSection() {
  const t = useTranslations('LandingPage.faq');
  const items = t.raw('items') as FaqItem[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-background py-20 sm:py-24">
      <Container>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <ScrollReveal
            className="max-w-xl lg:sticky lg:top-28 lg:self-start lg:pt-1"
            distance={24}
          >
            <p className="text-sm font-semibold tracking-[0.18em] text-brand/70">
              {t('eyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-brand sm:text-4xl">
              {t('heading')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-brand/75 sm:text-[0.95rem]">
              {t('subtitle')}
            </p>
          </ScrollReveal>

          <ScrollReveal className="w-full lg:ml-auto lg:max-w-180" delay={120}>
            {items.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={item.question}
                  className="border-b border-brand/20 last:border-b-0"
                >
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-3 py-5 text-left sm:py-6"
                    onClick={() => {
                      setOpenIndex(isOpen ? null : index);
                    }}
                    aria-expanded={isOpen}
                  >
                    <span
                      className={cn(
                        'pr-2 text-base font-semibold leading-snug transition-colors sm:text-[1.05rem]',
                        isOpen ? 'text-brand' : 'text-brand/90',
                      )}
                    >
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 transition-transform duration-300',
                        isOpen ? 'rotate-180 text-brand' : 'text-brand/45',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-7 text-sm leading-relaxed text-brand/75 sm:pb-6 sm:pr-10 sm:text-[0.95rem]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
