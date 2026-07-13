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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssignWebhook } from '@/hooks/use-wabas';
import { useInfiniteWebhooks } from '@/hooks/use-webhooks';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AssignWebhookDialogProps {
  wabaId: string;
  wabaName: string;
  currentWebhookId?: string | null;
}

export function AssignWebhookDialog({
  wabaId,
  wabaName,
  currentWebhookId,
}: AssignWebhookDialogProps) {
  const t = useTranslations('Admin.AssignWebhookDialog');
  const [open, setOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string>(
    currentWebhookId || 'none',
  );

  const { mutate: assignWebhook, isPending } = useAssignWebhook();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteWebhooks(10);

  const webhooks = data?.pages.flatMap((page) => page.webhooks) ?? [];

  const observer = useRef<IntersectionObserver | null>(null);
  const observerTargetRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();

      if (node) {
        observer.current = new IntersectionObserver(
          (entries) => {
            if (
              entries[0]?.isIntersecting &&
              hasNextPage &&
              !isFetchingNextPage
            ) {
              fetchNextPage();
            }
          },
          {
            // Use 200px margin to be safe and trigger earlier
            rootMargin: '200px',
          },
        );
        observer.current.observe(node);
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      // Sync state with props when opening
      setSelectedWebhook(currentWebhookId || 'none');
    }
  }

  function handleSave() {
    const webhookIdToSave = selectedWebhook === 'none' ? null : selectedWebhook;

    assignWebhook(
      { wabaId, webhookId: webhookIdToSave },
      {
        onSuccess: () => {
          toast.success(t('messages.success'));
          setOpen(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : t('messages.errorFallback'),
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-brand/20 text-brand hover:bg-muted hover:text-brand"
        >
          {t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t.rich('description', {
              name: wabaName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Select
            value={selectedWebhook}
            onValueChange={setSelectedWebhook}
            disabled={isPending || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('placeholder')} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="w-[var(--radix-select-trigger-width)] p-0"
            >
              <ScrollArea className="h-72">
                <div className="p-1">
                  <SelectItem
                    value="none"
                    className="font-semibold text-destructive"
                  >
                    {t('noneOption')}
                  </SelectItem>
                  {webhooks.map((webhook) => (
                    <SelectItem key={webhook.id} value={webhook.id}>
                      {webhook.name}
                    </SelectItem>
                  ))}

                  {/* Target for infinite scroll */}
                  <div ref={observerTargetRef} className="h-1 w-full" />

                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-brand/20 text-brand hover:bg-muted hover:text-brand"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
