import { ConversationAvatar } from '@/components/dashboard/chat/conversation-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatLastSeen } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  Loader2Icon,
  PhoneCallIcon,
  StarIcon,
  StickyNoteIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';

function getPredefinedLabels(t: ReturnType<typeof useTranslations>) {
  return [
    {
      value: 'new_customer',
      label: t('label.newCustomer'),
      Icon: UserIcon,
      color: 'text-blue-500',
    },
    {
      value: 'vip',
      label: t('label.vip'),
      Icon: StarIcon,
      color: 'text-amber-500',
    },
    {
      value: 'follow_up',
      label: t('label.followUp'),
      Icon: BellIcon,
      color: 'text-orange-500',
    },
    {
      value: 'completed',
      label: t('label.completed'),
      Icon: CheckCircleIcon,
      color: 'text-emerald-500',
    },
  ];
}

export function ContactInfoPanel({
  conversation,
  label,
  notes,
  isSaving,
  onLabelChange,
  onNotesChange,
  onClose,
  showMobileBackButton,
  className,
}: {
  conversation: ChatConversation;
  label: string;
  notes: string;
  isSaving?: boolean;
  onLabelChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onClose?: () => void;
  showMobileBackButton?: boolean;
  className?: string;
}) {
  const t = useTranslations('Chat.contact');
  const predefinedLabels = getPredefinedLabels(t);
  const isPredefined = predefinedLabels.some((l) => l.value === label);
  const isCustomInitially = Boolean(label) && !isPredefined;

  const [mode, setMode] = useState<'preset' | 'custom'>(
    isCustomInitially ? 'custom' : 'preset',
  );

  const [prevLabel, setPrevLabel] = useState(label);

  if (label !== prevLabel) {
    setPrevLabel(label);
    if (label && !predefinedLabels.some((l) => l.value === label)) {
      setMode('custom');
    } else {
      setMode('preset');
    }
  }

  const selectValue = mode === 'custom' ? '_custom_' : label || undefined;

  return (
    <aside
      className={cn('flex h-full w-full flex-col bg-background', className)}
    >
      <div className="flex h-18 shrink-0 items-center justify-start gap-2.5 bg-background px-6 sm:px-7">
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="-ml-2 hidden size-8 shrink-0 cursor-pointer text-muted-foreground hover:bg-transparent hover:text-brand lg:flex"
          >
            <XIcon className="size-5" />
            <span className="sr-only">{t('close')}</span>
          </Button>
        ) : null}

        {showMobileBackButton && onClose ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="-ml-2 shrink-0 cursor-pointer hover:bg-transparent lg:hidden"
          >
            <ArrowLeftIcon className="size-5" />
            <span className="sr-only">{t('back')}</span>
          </Button>
        ) : null}

        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {t('title')}
        </h3>
      </div>

      <ScrollArea className="min-h-0 flex-1 w-full [&_[data-slot=scroll-area-viewport]>div]:block!">
        <div className="flex w-full flex-col py-5">
          <div className="px-6 sm:px-7">
            <div className="flex items-center gap-3">
              <ConversationAvatar
                conversation={conversation}
                size="lg"
                avatarClassName="border-border"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  {conversation.displayName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.contactIdentifier}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {conversation.adminTakeover ? (
                  <Badge className="border-amber-400/35 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:text-amber-500">
                    {t('takeover')}
                  </Badge>
                ) : (
                  <Badge className="border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-emerald-700 dark:text-emerald-500">
                    {t('agentActive')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mx-6 mt-6 h-px bg-border sm:mx-7" />

          <section className="px-6 py-6 sm:px-7">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <div className="flex w-6 shrink-0 items-center justify-center">
                <ClockIcon className="size-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs text-muted-foreground">
                  {t('lastActivity')}
                </p>
                <p className="font-medium text-foreground">
                  {formatLastSeen(conversation.lastCustomerMessageAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm text-foreground">
              <div className="flex w-6 shrink-0 items-center justify-center">
                <PhoneCallIcon className="size-5 text-blue-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs text-muted-foreground">
                  {t('connectedVia')}
                </p>
                <p className="font-medium text-foreground">
                  {conversation.phoneNumber.displayPhoneNumber}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm text-foreground">
              <div className="flex w-6 shrink-0 items-center justify-center">
                {conversation.messagingProduct === 'whatsapp' ? (
                  <FaWhatsapp className="size-6 text-[#25D366]" />
                ) : (
                  <PhoneCallIcon className="size-5 text-blue-500" />
                )}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs text-muted-foreground">
                  {t('connectedPlatforms')}
                </p>
                <p className="font-medium text-foreground capitalize">
                  {conversation.messagingProduct}
                </p>
              </div>
            </div>
          </section>

          <div className="mx-6 h-px bg-border sm:mx-7" />

          <section className="px-6 py-6 sm:px-7">
            <Label className="flex items-center gap-2.5 text-sm font-medium leading-normal text-foreground">
              <TagIcon className="size-5 text-purple-500" />
              {t('customerLabel')}
            </Label>

            <div className="mt-3 space-y-2">
              <Select
                value={selectValue}
                onValueChange={(val) => {
                  if (val === '_custom_') {
                    setMode('custom');
                    onLabelChange('');
                  } else {
                    setMode('preset');
                    onLabelChange(val);
                  }
                }}
              >
                <SelectTrigger
                  className="w-full rounded-lg bg-background text-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                  size="lg"
                >
                  <SelectValue placeholder={t('selectLabel')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-lg p-1.5">
                  {predefinedLabels.map((labelOption) => (
                    <SelectItem
                      key={labelOption.value}
                      value={labelOption.value}
                      className="cursor-pointer rounded-lg py-2.5 focus:bg-brand/5 focus:text-brand my-0.5"
                    >
                      <labelOption.Icon
                        className={cn('size-4', labelOption.color)}
                      />
                      <span className="truncate">{labelOption.label}</span>
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="_custom_"
                    className="cursor-pointer rounded-lg py-2.5 focus:bg-brand/5 focus:text-brand my-0.5"
                  >
                    <TagIcon className="size-4 text-purple-500" />
                    <span className="truncate">{t('customLabel')}</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {mode === 'custom' && (
                <Input
                  type="text"
                  value={label}
                  onChange={(event) => {
                    onLabelChange(event.target.value);
                  }}
                  autoFocus
                  placeholder={t('typeLabel')}
                  className="block h-10 w-full rounded-lg bg-background px-3 py-0 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              )}
            </div>

            <Label
              htmlFor={'contact-notes-' + conversation.id}
              className="mt-6 flex items-center gap-2.5 text-sm font-medium leading-normal text-foreground"
            >
              <StickyNoteIcon className="size-5 text-amber-500" />
              {t('internalNotes')}
            </Label>
            <Textarea
              id={'contact-notes-' + conversation.id}
              value={notes}
              onChange={(event) => {
                onNotesChange(event.target.value);
              }}
              placeholder={t('addNote')}
              rows={2}
              className="mt-3 block min-h-0 w-full resize-none rounded-lg bg-background px-3 py-2 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden field-sizing-content"
            />

            {isSaving ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Loader2Icon className="size-3 animate-spin" />
                {t('saving')}
              </p>
            ) : null}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
