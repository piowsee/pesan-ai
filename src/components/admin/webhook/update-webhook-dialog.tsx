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
import {
  type Webhook,
  useRefreshWebhook,
  useUpdateWebhook,
} from '@/hooks/use-webhooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface UpdateWebhookDialogProps {
  webhook: Webhook;
}

export function UpdateWebhookDialog({ webhook }: UpdateWebhookDialogProps) {
  const t = useTranslations('Admin.UpdateWebhookDialog');
  const [isOpen, setIsOpen] = useState(false);
  const updateWebhook = useUpdateWebhook();
  const refreshWebhook = useRefreshWebhook();

  const updateWebhookSchema = z
    .object({
      name: z.string().min(1, t('validation.nameRequired')).max(100),
      webhookUrl: z.url(t('validation.invalidUrl')),
      passphrase: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.passphrase !== undefined && data.passphrase !== '') {
          return data.passphrase.length >= 1;
        }
        return true;
      },
      { path: ['passphrase'], message: t('validation.passphraseMinLength') },
    );

  type UpdateWebhookFormValues = z.infer<typeof updateWebhookSchema>;

  const form = useForm<UpdateWebhookFormValues>({
    resolver: zodResolver(updateWebhookSchema),
    defaultValues: {
      name: webhook.name,
      webhookUrl: webhook.webhookUrl,
      passphrase: '',
    },
  });

  const name = form.watch('name');
  const webhookUrl = form.watch('webhookUrl');
  const passphrase = form.watch('passphrase');

  const hasChanges =
    name !== webhook.name ||
    webhookUrl !== webhook.webhookUrl ||
    (!!passphrase && passphrase.length > 0);

  function handleRefresh() {
    refreshWebhook.mutate(webhook.id, {
      onSuccess: () => toast.success(t('messages.refreshSuccess')),
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : t('messages.errorFallback');
        toast.error(message);
      },
    });
  }

  async function handleUpdate(values: UpdateWebhookFormValues) {
    const payload: Record<string, unknown> = {};

    if (values.name !== webhook.name) payload.name = values.name;
    if (values.webhookUrl !== webhook.webhookUrl)
      payload.webhookUrl = values.webhookUrl;
    if (values.passphrase && values.passphrase.length > 0)
      payload.passphrase = values.passphrase;

    updateWebhook.mutate(
      { id: webhook.id, payload },
      {
        onSuccess: () => {
          toast.success(t('messages.success', { name: values.name }));
          setIsOpen(false);
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : t('messages.errorFallback');
          toast.error(message);
        },
      },
    );
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      form.reset({
        name: webhook.name,
        webhookUrl: webhook.webhookUrl,
        passphrase: '',
      });
      updateWebhook.reset();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-brand hover:bg-muted hover:text-brand"
        >
          <Pencil className="size-4" />
          <span className="sr-only">{t('trigger')}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 text-brand shadow-xl sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 size-7 shrink-0 text-brand" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-brand">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-brand">
                {t('description', { name: webhook.name })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5">
          <div className="h-px bg-brand/20" />
        </div>

        <form
          onSubmit={form.handleSubmit(handleUpdate)}
          className="flex flex-col gap-4 px-5 py-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="update-webhook-name" className="text-brand">
              {t('labels.name')}
            </Label>
            <Input
              id="update-webhook-name"
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
            <Label htmlFor="update-webhook-url" className="text-brand">
              {t('labels.webhookUrl')}
            </Label>
            <Input
              id="update-webhook-url"
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
            <Label htmlFor="update-webhook-passphrase" className="text-brand">
              {t('labels.passphrase')}
            </Label>
            <Input
              id="update-webhook-passphrase"
              type="password"
              placeholder={t('placeholders.passphrase')}
              {...form.register('passphrase')}
              aria-invalid={!!form.formState.errors.passphrase}
              className={cn(
                form.formState.errors.passphrase &&
                  'border-destructive focus-visible:ring-destructive/20',
              )}
            />
            <p className="text-xs text-brand/50">
              {t('labels.passphraseHint')}
            </p>
            {form.formState.errors.passphrase && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.passphrase.message}
              </p>
            )}
          </div>

          {updateWebhook.isError && (
            <p className="text-xs font-medium text-destructive">
              {updateWebhook.error instanceof Error
                ? updateWebhook.error.message
                : t('messages.errorFallback')}
            </p>
          )}

          <DialogFooter className="mx-0 mb-0 mt-2 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
            <Button
              type="button"
              variant="outline"
              className="mr-auto"
              onClick={handleRefresh}
              disabled={refreshWebhook.isPending || updateWebhook.isPending}
            >
              {refreshWebhook.isPending ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  {t('actions.refreshing')}
                </>
              ) : (
                t('actions.refresh')
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-brand hover:bg-primary/5 hover:text-brand"
              onClick={() => handleOpenChange(false)}
              disabled={updateWebhook.isPending || refreshWebhook.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={updateWebhook.isPending || !hasChanges}
            >
              {updateWebhook.isPending ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  {t('actions.saving')}
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
