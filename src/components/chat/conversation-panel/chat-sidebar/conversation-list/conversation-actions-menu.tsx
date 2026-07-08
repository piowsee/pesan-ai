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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            {actions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onSelect={() => selectAction(action)}
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionAwaitingConfirmation.confirmation.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionAwaitingConfirmation.confirmation.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={actionAwaitingConfirmation.execute}>
                {actionAwaitingConfirmation.confirmation.actionLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
