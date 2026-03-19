'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteWebhook } from '@/hooks/use-webhooks';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteWebhookDialogProps {
  webhookId: string;
  webhookName: string;
}

export function DeleteWebhookDialog({
  webhookId,
  webhookName,
}: DeleteWebhookDialogProps) {
  const deleteWebhook = useDeleteWebhook();

  function handleDelete() {
    deleteWebhook.mutate(webhookId, {
      onSuccess: () => {
        toast.success(`Webhook "${webhookName}" deleted successfully`);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to delete webhook';
        toast.error(message);
      },
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete webhook ${webhookName}`}
        >
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{webhookName}&quot;? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteWebhook.isPending}
          >
            {deleteWebhook.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
