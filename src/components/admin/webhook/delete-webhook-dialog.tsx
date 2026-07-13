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

      <DialogContent className="gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 text-brand shadow-xl sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <Trash2 className="mt-0.5 size-7 shrink-0 text-destructive" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-brand">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-brand">
                {t('description', { name })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5">
          <div className="h-px bg-brand/20" />
        </div>

        <DialogFooter className="mx-5 mb-5 mt-5 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="text-brand hover:bg-primary/5 hover:text-brand"
            onClick={() => setIsOpen(false)}
            disabled={deleteWebhook.isPending}
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
