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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, KeyRound, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
      <DialogContent className="max-h-[85vh] sm:max-w-[700px] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 pb-0">
          <DialogTitle className="text-xl">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-8 pr-4">
            {/* Authentication */}
            <section className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="size-4" />
                </div>
                <h3 className="font-semibold text-lg">
                  {t('sections.auth.title')}
                </h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground pl-10">
                <p>
                  {t.rich('sections.auth.p1', {
                    authCode: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                    strongAuth: (chunks) => <strong>{chunks}</strong>,
                    strongPassphrase: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <p>
                  {t.rich('sections.auth.p2', {
                    strongType: (chunks) => <strong>{chunks}</strong>,
                    strongAlgo: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
            </section>

            {/* Validation Request */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <h3 className="font-semibold text-lg">
                  {t('sections.validation.title')}
                </h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground pl-10">
                <p>
                  {t.rich('sections.validation.p1', {
                    strongGet: (chunks) => <strong>{chunks}</strong>,
                    codeOk: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                  })}
                </p>
              </div>
            </section>

            {/* Message Request */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="size-4" />
                </div>
                <h3 className="font-semibold text-lg">
                  {t('sections.message.title')}
                </h3>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground pl-10">
                <p>
                  {t.rich('sections.message.p1', {
                    strongPost: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>

                <div className="space-y-2">
                  <p>
                    {t.rich('sections.message.p2', {
                      codePhone: (chunks) => (
                        <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                          {chunks}
                        </code>
                      ),
                      codeMessages: (chunks) => (
                        <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                          {chunks}
                        </code>
                      ),
                    })}
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      {t.rich('sections.message.list.phone', {
                        codeField: (chunks) => (
                          <code className="font-semibold">{chunks}</code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.sequence', {
                        codeField: (chunks) => (
                          <code className="font-semibold">{chunks}</code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.source', {
                        codeField: (chunks) => (
                          <code className="font-semibold">{chunks}</code>
                        ),
                        codeSource: (chunks) => (
                          <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                            {chunks}
                          </code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.timestamp', {
                        codeField: (chunks) => (
                          <code className="font-semibold">{chunks}</code>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich('sections.message.list.content', {
                        codeField: (chunks) => (
                          <code className="font-semibold">{chunks}</code>
                        ),
                      })}
                    </li>
                  </ul>
                </div>

                <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-foreground">
                    {JSON.stringify(
                      {
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
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <p>
                  {t.rich('sections.message.p3', {
                    codeBot: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                    codeAdmin: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                    codeFalse: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                    codeTrue: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                  })}
                </p>

                <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-foreground">
                    {JSON.stringify(
                      {
                        botResponse: 'Your order is currently being processed.',
                        adminTakeover: false,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <p>
                  {t.rich('sections.message.p4', {
                    code429: (chunks) => (
                      <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
                        {chunks}
                      </code>
                    ),
                  })}
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
