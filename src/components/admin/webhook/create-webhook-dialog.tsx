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
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// ─── Component ───────────────────────────────────────────────────────

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
        <Button>
          <Plus data-icon="inline-start" />
          {t('trigger')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Name Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-name">{t('labels.name')}</Label>
            <Input
              id="webhook-name"
              placeholder={t('placeholders.name')}
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* URL Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-url">{t('labels.webhookUrl')}</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder={t('placeholders.webhookUrl')}
              {...form.register('webhookUrl')}
              aria-invalid={!!form.formState.errors.webhookUrl}
            />
            {form.formState.errors.webhookUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.webhookUrl.message}
              </p>
            )}
          </div>

          {/* Passphrase Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-passphrase">{t('labels.passphrase')}</Label>
            <Input
              id="webhook-passphrase"
              type="password"
              placeholder={t('placeholders.passphrase')}
              {...form.register('passphrase')}
              aria-invalid={!!form.formState.errors.passphrase}
            />
            {form.formState.errors.passphrase && (
              <p className="text-sm text-destructive">
                {form.formState.errors.passphrase.message}
              </p>
            )}
          </div>

          {/* Server Error */}
          {createWebhook.isError && (
            <p className="text-sm text-destructive">
              {createWebhook.error instanceof Error
                ? createWebhook.error.message
                : t('messages.errorFallback')}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={createWebhook.isPending}>
              {createWebhook.isPending
                ? t('actions.creating')
                : t('actions.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
