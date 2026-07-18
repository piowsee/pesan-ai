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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import {
  CheckCircleIcon,
  LoaderCircleIcon,
  type LucideIcon,
  MoreHorizontalIcon,
  UserRoundCheckIcon,
} from 'lucide-react';
import { useState } from 'react';

interface ConversationActionsMenuProps {
  conversation: ChatConversation;
  isTakeoverPending?: boolean;
  onToggleTakeover: (nextAdminTakeover: boolean) => void;
}

interface ConversationMenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  disabled?: boolean;
  confirmation?: {
    title: string;
    description: string;
    actionLabel: string;
  };
  execute: () => void;
}

export function ConversationActionsMenu({
  conversation,
  isTakeoverPending,
  onToggleTakeover,
}: ConversationActionsMenuProps) {
  const [actionAwaitingConfirmation, setActionAwaitingConfirmation] =
    useState<ConversationMenuAction | null>(null);
  const takeoverActionLabel = conversation.adminTakeover
    ? 'Close conversation'
    : 'Take over';
  const ConfirmationIcon = conversation.adminTakeover
    ? CheckCircleIcon
    : UserRoundCheckIcon;
  const actions: ConversationMenuAction[] = [
    {
      id: 'toggle-takeover',
      label: takeoverActionLabel,
      icon: isTakeoverPending
        ? LoaderCircleIcon
        : conversation.adminTakeover
          ? CheckCircleIcon
          : UserRoundCheckIcon,
      iconClassName: isTakeoverPending ? 'animate-spin' : undefined,
      disabled: isTakeoverPending,
      confirmation: {
        title: conversation.adminTakeover
          ? 'Close this conversation?'
          : 'Take over this conversation?',
        description: conversation.adminTakeover
          ? `The bot will resume handling new messages from ${conversation.displayName}.`
          : `The bot will stop replying to ${conversation.displayName} until an admin closes this conversation.`,
        actionLabel: takeoverActionLabel,
      },
      execute: () => onToggleTakeover(!conversation.adminTakeover),
    },
  ];

  function selectAction(action: ConversationMenuAction) {
    if (action.confirmation) {
      setActionAwaitingConfirmation(action);
      return;
    }

    action.execute();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={`Conversation actions for ${conversation.displayName}`}
          >
            <MoreHorizontalIcon data-icon="inline-start" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-lg border bg-background p-0 text-foreground shadow-lg"
        >
          <DropdownMenuGroup className="p-2">
            {actions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onSelect={() => selectAction(action)}
                  className={cn(
                    'min-h-10 cursor-pointer gap-3 rounded-md px-3 py-2',
                    action.id === 'toggle-takeover' &&
                      conversation.adminTakeover
                      ? 'text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-500 dark:focus:bg-emerald-950 dark:focus:text-emerald-400'
                      : 'text-foreground/60 focus:bg-brand/5 focus:text-brand',
                  )}
                >
                  <ActionIcon className={action.iconClassName} />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {actionAwaitingConfirmation?.confirmation ? (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setActionAwaitingConfirmation(null);
          }}
        >
          <AlertDialogContent className="gap-0 overflow-hidden rounded-lg border p-0 shadow-xl sm:max-w-md">
            <AlertDialogHeader className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <ConfirmationIcon
                  className={cn(
                    'mt-0.5 size-6 shrink-0',
                    conversation.adminTakeover
                      ? 'text-emerald-600 dark:text-emerald-500'
                      : 'text-brand',
                  )}
                />
                <div className="min-w-0 text-left">
                  <AlertDialogTitle className="text-base font-semibold">
                    {actionAwaitingConfirmation.confirmation.title}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {actionAwaitingConfirmation.confirmation.description}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="px-5">
              <div className="h-px bg-border" />
            </div>

            <div className="flex flex-col px-5 py-4">
              <AlertDialogFooter className="mx-0 mb-0 gap-2 border-t-0 bg-transparent p-0">
                <AlertDialogCancel variant="ghost">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={
                    conversation.adminTakeover
                      ? '!bg-emerald-600 !text-white hover:!bg-emerald-700 dark:!bg-emerald-600 dark:hover:!bg-emerald-700'
                      : '!bg-brand !text-white hover:!bg-brand/90'
                  }
                  onClick={actionAwaitingConfirmation.execute}
                >
                  {actionAwaitingConfirmation.confirmation.actionLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
