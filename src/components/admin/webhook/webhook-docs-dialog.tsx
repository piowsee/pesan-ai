'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Code, KeyRound, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-brand/8 px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-brand">
      {children}
    </code>
  );
}

function CodeExample({ value }: { value: unknown }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-brand/10 bg-brand/5 p-4 font-mono text-xs">
      <pre className="text-brand">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function WebhookDocsDialog() {
  const t = useTranslations('Admin.WebhookDocsDialog');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="border-brand/20 text-brand hover:bg-muted hover:text-brand"
        >
          <Code data-icon="inline-start" />
          {t('trigger')}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 text-brand shadow-xl sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 pr-12 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <Code className="mt-0.5 size-7 shrink-0 text-brand" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-brand">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-brand">
                {t('description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 px-5 sm:px-6">
          <div className="h-px bg-brand/20" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-gutter:stable] sm:px-6">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 shrink-0 text-brand/70" />
                <h3 className="text-base font-semibold text-brand">
                  {t('sections.auth.title')}
                </h3>
              </div>
              <div className="flex flex-col gap-3 text-sm leading-6 text-brand/75 sm:pl-7">
                <p>
                  {t.rich('sections.auth.p1', {
                    authCode: (chunks) => <InlineCode>{chunks}</InlineCode>,
                    strongAuth: (chunks) => (
                      <strong className="font-semibold text-brand">
                        {chunks}
                      </strong>
                    ),
                    strongPassphrase: (chunks) => (
                      <strong className="font-semibold text-brand">
                        {chunks}
                      </strong>
                    ),
                  })}
                </p>
                <p>
                  {t.rich('sections.auth.p2', {
                    strongType: (chunks) => (
                      <strong className="font-semibold text-brand">
                        {chunks}
                      </strong>
                    ),
                    strongAlgo: (chunks) => (
                      <strong className="font-semibold text-brand">
                        {chunks}
                      </strong>
                    ),
                  })}
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 shrink-0 text-brand/70" />
                <h3 className="text-base font-semibold text-brand">
                  {t('sections.validation.title')}
                </h3>
              </div>
              <div className="text-sm leading-6 text-brand/75 sm:pl-7">
                <p>
                  {t.rich('sections.validation.p1', {
                    strongGet: (chunks) => (
                      <strong className="font-semibold text-brand">
                        {chunks}
                      </strong>
                    ),
                    codeOk: (chunks) => <InlineCode>{chunks}</InlineCode>,
                  })}
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 shrink-0 text-brand/70" />
                <h3 className="text-base font-semibold text-brand">
                  {t('sections.message.title')}
                </h3>
              </div>

              <div className="flex flex-col gap-4 text-sm leading-6 text-brand/75 sm:pl-7">
                <p>
                  {t.rich('sections.message.p1', {
                    strongPost: (chunks) => (
                      <strong className="font-semibold text-brand">
                        {chunks}
                      </strong>
                    ),
                  })}
                </p>

                <div className="flex flex-col gap-2">
                  <p>
                    {t.rich('sections.message.p2', {
                      codePhone: (chunks) => <InlineCode>{chunks}</InlineCode>,
                      codeMessages: (chunks) => (
                        <InlineCode>{chunks}</InlineCode>
                      ),
                    })}
                  </p>
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    <li>
                      {t.rich('sections.message.list.phone', {
                        codeField: (chunks) => (
                          <code className="font-semibold text-brand">
                            {chunks}
                          </code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.sequence', {
                        codeField: (chunks) => (
                          <code className="font-semibold text-brand">
                            {chunks}
                          </code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.source', {
                        codeField: (chunks) => (
                          <code className="font-semibold text-brand">
                            {chunks}
                          </code>
                        ),
                        codeSource: (chunks) => (
                          <InlineCode>{chunks}</InlineCode>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.timestamp', {
                        codeField: (chunks) => (
                          <code className="font-semibold text-brand">
                            {chunks}
                          </code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.content', {
                        codeField: (chunks) => (
                          <code className="font-semibold text-brand">
                            {chunks}
                          </code>
                        ),
                      })}
                    </li>
                  </ul>
                </div>

                <CodeExample
                  value={{
                    customerPhoneNumber: '+1234567890',
                    messages: [
                      {
                        sequence: 1,
                        source: 'customer',
                        timestamp: '2023-10-25T10:00:00Z',
                        content: 'Hi, I need help with my order.',
                      },
                      {
                        sequence: 2,
                        source: 'bot',
                        timestamp: '2023-10-25T10:01:00Z',
                        content:
                          'Sure, I can help with that. What is your order number?',
                      },
                    ],
                  }}
                />

                <p>
                  {t.rich('sections.message.p3', {
                    codeBot: (chunks) => <InlineCode>{chunks}</InlineCode>,
                    codeAdmin: (chunks) => <InlineCode>{chunks}</InlineCode>,
                    codeFalse: (chunks) => <InlineCode>{chunks}</InlineCode>,
                    codeTrue: (chunks) => <InlineCode>{chunks}</InlineCode>,
                  })}
                </p>

                <CodeExample
                  value={{
                    botResponse: 'Your order is currently being processed.',
                    adminTakeover: false,
                  }}
                />

                <p>
                  {t.rich('sections.message.p4', {
                    code429: (chunks) => <InlineCode>{chunks}</InlineCode>,
                  })}
                </p>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
