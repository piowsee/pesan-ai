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
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import type { ChatMessage } from '@/types/chat';
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type ReactElement,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { canPreviewDocument } from './document-message/document-utils';
import {
  type GetMediaUrl,
  type MessageAction,
  MessageMenuError,
  type MessageMenuErrorCode,
  runMessageAction,
} from './message-actions';
import { isMediaMessageType } from './message-utils';

type MessageActionItem = {
  action: MessageAction;
  icon: LucideIcon;
  label: string;
};

type MessageMenuContextValue = {
  actions: MessageActionItem[];
  onAction: (action: MessageAction) => void;
  pendingAction: MessageAction | null;
};

const MessageMenuContext = createContext<MessageMenuContextValue | null>(null);

const errorTranslationKeys = {
  clipboardPermission: 'menu.errors.clipboardPermission',
  clipboardUnsupported: 'menu.errors.clipboardUnsupported',
  fileOpenFailed: 'menu.errors.fileOpenFailed',
  fileSaveFailed: 'menu.errors.fileSaveFailed',
  formatUnsupported: 'menu.errors.formatUnsupported',
  mediaFetchFailed: 'menu.errors.mediaFetchFailed',
  savePickerUnsupported: 'menu.errors.savePickerUnsupported',
  signedUrlInvalid: 'menu.errors.signedUrlInvalid',
  urlUnavailable: 'menu.errors.urlUnavailable',
} as const satisfies Record<MessageMenuErrorCode, string>;

function MessageActionList({
  actions,
  menu,
  onAction,
  pendingAction,
}: MessageMenuContextValue & {
  menu: 'context' | 'dropdown';
}) {
  const Group = menu === 'context' ? ContextMenuGroup : DropdownMenuGroup;
  const Item = menu === 'context' ? ContextMenuItem : DropdownMenuItem;

  return (
    <Group className="p-1.5">
      {actions.map((item) => {
        const Icon = item.icon;
        const isPending = pendingAction === item.action;

        return (
          <Item
            key={item.action}
            aria-busy={isPending}
            disabled={pendingAction !== null}
            onSelect={() => onAction(item.action)}
            className="min-h-9 cursor-pointer gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-foreground/80 focus:bg-brand/5 focus:text-brand"
          >
            {isPending ? (
              <Spinner className="text-brand/80" />
            ) : (
              <Icon className="text-brand/80" />
            )}
            <span className="font-medium">{item.label}</span>
          </Item>
        );
      })}
    </Group>
  );
}

const menuContentClassName =
  'w-40 min-w-0 overflow-hidden rounded-lg border bg-background p-0 text-foreground shadow-lg';

function canOpenInBrowser(message: ChatMessage) {
  if (message.type === 'image' || message.type === 'video') {
    return true;
  }

  if (message.type !== 'document') {
    return false;
  }

  return canPreviewDocument(message);
}

function useMessageOpen() {
  const context = useContext(MessageMenuContext);

  return context ? () => context.onAction('open') : undefined;
}

function MessageMenuButton() {
  const context = useContext(MessageMenuContext);
  const t = useTranslations('Chat.bubble');

  if (!context) {
    return null;
  }

  const isPending = context.pendingAction !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="unstyled"
          aria-label={t('menu.label')}
          aria-busy={isPending}
          disabled={isPending}
          className="pointer-events-none absolute top-1 right-2 z-30 flex size-8 items-center justify-center overflow-visible text-slate-700 opacity-0 outline-none transition-opacity before:pointer-events-none before:absolute before:-inset-2 before:bg-radial before:from-slate-100/85 before:via-slate-100/45 before:via-40% before:to-transparent before:to-75% before:blur-[2px] group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100 hover:text-slate-950 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none disabled:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:text-slate-950 data-[state=open]:opacity-100 [&_svg]:relative [&_svg]:size-5"
        >
          {isPending ? <Spinner /> : <ChevronDownIcon strokeWidth={2.25} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={6}
        className={menuContentClassName}
      >
        <MessageActionList {...context} menu="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageMenu({
  children,
  getMediaUrl,
  message,
}: {
  children: ReactElement;
  getMediaUrl?: GetMediaUrl;
  message: ChatMessage;
}) {
  const t = useTranslations('Chat.bubble');
  const [confirmDownloadOpen, setConfirmDownloadOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<MessageAction | null>(
    null,
  );
  const pendingActionRef = useRef<MessageAction | null>(null);
  const actions = useMemo<MessageActionItem[]>(() => {
    if (message.type === 'text') {
      return [{ action: 'copy', icon: CopyIcon, label: t('menu.copy') }];
    }

    if (!isMediaMessageType(message.type)) {
      return [];
    }

    const mediaActions: MessageActionItem[] = [];

    if (message.type !== 'audio') {
      mediaActions.push({
        action: 'open',
        icon: ExternalLinkIcon,
        label: t('menu.open'),
      });
    }

    mediaActions.push({
      action: 'save',
      icon: DownloadIcon,
      label: t('menu.saveAs'),
    });

    if (message.type === 'image') {
      mediaActions.push({
        action: 'copy',
        icon: CopyIcon,
        label: t('menu.copy'),
      });
    }

    return mediaActions;
  }, [message.type, t]);

  const executeAction = useCallback(
    async (action: MessageAction) => {
      if (pendingActionRef.current) {
        return;
      }

      pendingActionRef.current = action;
      setPendingAction(action);

      try {
        await runMessageAction({ action, getMediaUrl, message });

        if (action === 'copy') {
          toast.success(t('menu.copied'));
        }
      } catch (error: unknown) {
        const code =
          error instanceof MessageMenuError
            ? error.code
            : action === 'open'
              ? 'fileOpenFailed'
              : action === 'save'
                ? 'fileSaveFailed'
                : 'formatUnsupported';

        toast.error(t(errorTranslationKeys[code]));
      } finally {
        pendingActionRef.current = null;
        setPendingAction(null);
      }
    },
    [getMediaUrl, message, t],
  );

  const onAction = useCallback(
    (action: MessageAction) => {
      if (pendingActionRef.current) {
        return;
      }

      if (action === 'open' && !canOpenInBrowser(message)) {
        setConfirmDownloadOpen(true);
        return;
      }

      void executeAction(action);
    },
    [executeAction, message],
  );

  const contextValue = useMemo(
    () => ({ actions, onAction, pendingAction }),
    [actions, onAction, pendingAction],
  );

  if (actions.length === 0) {
    return children;
  }

  return (
    <MessageMenuContext.Provider value={contextValue}>
      <>
        <ContextMenu>
          <ContextMenuTrigger
            asChild
            data-slot={undefined}
            className="select-text"
          >
            {children}
          </ContextMenuTrigger>
          <ContextMenuContent className={menuContentClassName}>
            <MessageActionList {...contextValue} menu="context" />
          </ContextMenuContent>
        </ContextMenu>
        <AlertDialog
          open={confirmDownloadOpen}
          onOpenChange={(open) => {
            if (!pendingActionRef.current) {
              setConfirmDownloadOpen(open);
            }
          }}
        >
          <AlertDialogContent className="gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 shadow-xl sm:max-w-md">
            <AlertDialogHeader className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <DownloadIcon className="mt-0.5 size-6 shrink-0 text-brand" />
                <div className="min-w-0 text-left">
                  <AlertDialogTitle className="text-base font-semibold">
                    {t('menu.downloadConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t('menu.downloadConfirmDescription')}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="px-5">
              <Separator className="bg-brand/15" />
            </div>

            <div className="flex flex-col px-5 py-4">
              <AlertDialogFooter className="mx-0 mb-0 gap-2 border-t-0 bg-transparent p-0">
                <AlertDialogCancel
                  variant="ghost"
                  disabled={pendingAction !== null}
                >
                  {t('menu.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="brand"
                  aria-busy={pendingAction === 'save'}
                  disabled={pendingAction !== null}
                  onClick={(event) => {
                    event.preventDefault();
                    void executeAction('save').finally(() => {
                      setConfirmDownloadOpen(false);
                    });
                  }}
                >
                  {pendingAction === 'save' ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {t('menu.saving')}
                    </>
                  ) : (
                    t('menu.download')
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </MessageMenuContext.Provider>
  );
}

export { MessageMenu, MessageMenuButton, useMessageOpen };
