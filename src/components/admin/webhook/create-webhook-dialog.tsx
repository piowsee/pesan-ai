'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWebhook } from '@/hooks/use-webhooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Webhook } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export function CreateWebhookDialog() {
  const t = useTranslations('Admin.CreateWebhookDialog');
  const [isOpen, setIsOpen] = useState(false);
  const createWebhook = useCreateWebhook();

  const createWebhookSchema = z.object({
    name: z.string().min(1, t('validation.nameRequired')).max(100),
    webhookUrl: z.url(t('validation.invalidUrl')),
    passphrase: z.string().min(1, t('validation.passphraseRequired')),
  });

  type CreateWebhookFormValues = z.infer<typeof createWebhookSchema>;

  const form = useForm<CreateWebhookFormValues>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      name: '',
      webhookUrl: '',
      passphrase: '',
    },
  });

  async function onSubmit(values: CreateWebhookFormValues) {
    createWebhook.mutate(values, {
      onSuccess: () => {
        toast.success(t('messages.success'));
        form.reset();
        setIsOpen(false);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : t('messages.errorFallback');
        toast.error(message);
      },
    });
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      form.reset();
      createWebhook.reset();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="brand" size="lg">
          <Plus data-icon="inline-start" />
          {t('trigger')}
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 text-brand shadow-xl sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <Webhook className="mt-0.5 size-7 shrink-0 text-brand" />
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

        <div className="px-5">
          <div className="h-px bg-brand/20" />
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-5 py-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-name" className="text-brand">
              {t('labels.name')}
            </Label>
            <Input
              id="webhook-name"
              placeholder={t('placeholders.name')}
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
              className={cn(
                form.formState.errors.name &&
                  'border-destructive focus-visible:ring-destructive/20',
              )}
            />
            {form.formState.errors.name && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-url" className="text-brand">
              {t('labels.webhookUrl')}
            </Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder={t('placeholders.webhookUrl')}
              {...form.register('webhookUrl')}
              aria-invalid={!!form.formState.errors.webhookUrl}
              className={cn(
                form.formState.errors.webhookUrl &&
                  'border-destructive focus-visible:ring-destructive/20',
              )}
            />
            {form.formState.errors.webhookUrl && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.webhookUrl.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-passphrase" className="text-brand">
              {t('labels.passphrase')}
            </Label>
            <Input
              id="webhook-passphrase"
              type="password"
              placeholder={t('placeholders.passphrase')}
              {...form.register('passphrase')}
              aria-invalid={!!form.formState.errors.passphrase}
              className={cn(
                form.formState.errors.passphrase &&
                  'border-destructive focus-visible:ring-destructive/20',
              )}
            />
            {form.formState.errors.passphrase && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.passphrase.message}
              </p>
            )}
          </div>

          {createWebhook.isError && (
            <p className="text-xs font-medium text-destructive">
              {createWebhook.error instanceof Error
                ? createWebhook.error.message
                : t('messages.errorFallback')}
            </p>
          )}

          <DialogFooter className="mx-0 mb-0 mt-2 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-brand hover:bg-primary/5 hover:text-brand"
              onClick={() => handleOpenChange(false)}
              disabled={createWebhook.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={createWebhook.isPending}
            >
              {createWebhook.isPending ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  {t('actions.creating')}
                </>
              ) : (
                t('actions.submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
