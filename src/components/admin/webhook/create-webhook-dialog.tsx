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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// ─── Schema ──────────────────────────────────────────────────────────

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  webhookUrl: z.url('Enter a valid URL'),
  passphrase: z.string().min(1, 'Passphrase is required'),
});

type CreateWebhookFormValues = z.infer<typeof createWebhookSchema>;

// ─── Component ───────────────────────────────────────────────────────

export function CreateWebhookDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const createWebhook = useCreateWebhook();

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
        toast.success('Webhook created successfully');
        form.reset();
        setIsOpen(false);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to create webhook';
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
          Add Webhook
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Webhook</DialogTitle>
          <DialogDescription>
            Enter the webhook details below. The URL will be validated before
            saving.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Name Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-name">Name</Label>
            <Input
              id="webhook-name"
              placeholder="My Webhook"
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
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://example.com/webhook"
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
            <Label htmlFor="webhook-passphrase">Passphrase</Label>
            <Input
              id="webhook-passphrase"
              type="password"
              placeholder="Shared secret for JWT signing"
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
                : 'Failed to create webhook'}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createWebhook.isPending}>
              {createWebhook.isPending ? 'Creating...' : 'Add Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
