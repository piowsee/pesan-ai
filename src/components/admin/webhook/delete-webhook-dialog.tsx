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
import { useDeleteWebhook } from '@/hooks/use-webhooks';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteWebhookDialogProps {
  id: string;
  name: string;
}

export function DeleteWebhookDialog({ id, name }: DeleteWebhookDialogProps) {
  const t = useTranslations('Admin.DeleteWebhookDialog');
  const [isOpen, setIsOpen] = useState(false);
  const deleteWebhook = useDeleteWebhook();

  function handleDelete() {
    deleteWebhook.mutate(id, {
      onSuccess: () => {
        toast.success(t('messages.success', { name }));
        setIsOpen(false);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : t('messages.errorFallback');
        toast.error(message);
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">{t('trigger')}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description', { name })}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-brand/20 text-brand hover:bg-muted hover:text-brand"
            onClick={() => setIsOpen(false)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteWebhook.isPending}
          >
            {deleteWebhook.isPending
              ? t('actions.deleting')
              : t('actions.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
