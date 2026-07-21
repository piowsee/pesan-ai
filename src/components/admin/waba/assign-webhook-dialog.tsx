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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssignWebhook } from '@/hooks/use-wabas';
import { useInfiniteWebhooks } from '@/hooks/use-webhooks';
import { Loader2, Webhook } from 'lucide-react';
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
      <DialogContent className="gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 text-brand shadow-xl sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <Webhook className="mt-0.5 size-7 shrink-0 text-brand" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-brand">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-brand">
                {t.rich('description', {
                  name: wabaName,
                  strong: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5">
          <div className="h-px bg-brand/20" />
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <Select
            value={selectedWebhook}
            onValueChange={setSelectedWebhook}
            disabled={isPending || isLoading}
          >
            <SelectTrigger size="lg" className="w-full">
              <SelectValue placeholder={t('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  value="none"
                  className="font-semibold text-destructive focus:text-destructive data-[highlighted]:text-destructive"
                >
                  {t('noneOption')}
                </SelectItem>
                {webhooks.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    {webhook.name}
                  </SelectItem>
                ))}

                <div ref={observerTargetRef} className="h-1 w-full" />

                {isFetchingNextPage && (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="mx-5 mb-5 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
          <Button
            variant="ghost"
            className="text-brand hover:bg-primary/5 hover:text-brand"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button variant="brand" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
