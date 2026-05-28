import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatLastSeen } from '@/lib/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircleIcon,
  PhoneCallIcon,
  StarIcon,
  StickyNoteIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';

const PREDEFINED_LABELS = [
  {
    value: 'new_customer',
    label: 'New Customer',
    Icon: UserIcon,
    color: 'text-blue-500',
  },
  {
    value: 'vip',
    label: 'VIP Customer',
    Icon: StarIcon,
    color: 'text-amber-500',
  },
  {
    value: 'follow_up',
    label: 'Needs Follow Up',
    Icon: BellIcon,
    color: 'text-orange-500',
  },
  {
    value: 'completed',
    label: 'Completed',
    Icon: CheckCircleIcon,
    color: 'text-emerald-500',
  },
];

export function ContactInfoPanel({
  conversation,
  label,
  notes,
  onLabelChange,
  onNotesChange,
  onClose,
  showMobileBackButton,
  className,
}: {
  conversation: ChatConversation;
  label: string;
  notes: string;
  onLabelChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onClose?: () => void;
  showMobileBackButton?: boolean;
  className?: string;
}) {
  const isPredefined = PREDEFINED_LABELS.some((l) => l.value === label);
  const isCustomInitially = Boolean(label) && !isPredefined;

  const [mode, setMode] = useState<'preset' | 'custom'>(
    isCustomInitially ? 'custom' : 'preset',
  );

  const [prevLabel, setPrevLabel] = useState(label);

  if (label !== prevLabel) {
    setPrevLabel(label);
    if (label && !PREDEFINED_LABELS.some((l) => l.value === label)) {
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
      <div className="flex h-15 shrink-0 items-center justify-start gap-2.5 px-6 sm:px-7">
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="-ml-2 size-8 shrink-0 cursor-pointer text-brand/70 hover:text-brand hidden lg:flex"
          >
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </Button>
        ) : null}

        {showMobileBackButton && onClose ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="-ml-2 shrink-0 cursor-pointer lg:hidden"
          >
            <ArrowLeftIcon className="size-5 text-brand" />
            <span className="sr-only">Back to conversation</span>
          </Button>
        ) : null}

        <h3 className="text-base font-semibold tracking-tight text-brand">
          Contact info
        </h3>
      </div>

      <ScrollArea className="min-h-0 flex-1 w-full [&_[data-slot=scroll-area-viewport]>div]:block!">
        <div className="flex w-full flex-col py-5">
          <div className="px-6 sm:px-7">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 shrink-0 border border-brand/25">
                <AvatarImage
                  src={
                    conversation.phoneNumber.businessProfile
                      ?.profilePictureUrl ?? undefined
                  }
                  alt={conversation.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-brand/15 text-sm font-medium text-brand">
                  {conversation.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  {conversation.displayName}
                </p>
                <p className="truncate text-sm text-brand/80">
                  {conversation.customerPhone}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {conversation.adminTakeover ? (
                  <Badge className="border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-emerald-700">
                    Takeover
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mx-6 mt-6 h-px bg-brand/15 sm:mx-7" />

          <section className="px-6 py-6 sm:px-7">
            <p className="text-xs font-medium text-brand/80">Last activity</p>
            <p className="mt-1 text-sm text-foreground">
              {formatLastSeen(conversation.lastCustomerMessageAt)}
            </p>

            <div className="mt-4 flex items-start gap-2 text-sm text-foreground">
              <PhoneCallIcon className="mt-0.5 size-4 text-brand/75" />
              <div>
                <p className="text-xs text-brand/80">Connected via admin</p>
                <p className="font-medium text-brand">
                  {conversation.phoneNumber.displayPhoneNumber}
                </p>
              </div>
            </div>
          </section>

          <div className="mx-6 h-px bg-brand/15 sm:mx-7" />

          <section className="px-6 py-6 sm:px-7">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TagIcon className="size-4 text-brand/75" />
              Customer label
            </label>

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
                <SelectTrigger className="h-10 w-full rounded-lg border-brand/15 bg-brand/5 focus:ring-brand/35 text-sm transition-colors hover:bg-brand/10">
                  <SelectValue placeholder="Select customer label..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_LABELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.Icon className={cn('size-4', option.color)} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="_custom_">
                    <div className="flex items-center gap-2 text-brand">
                      <TagIcon className="size-4" />
                      <span>Custom label...</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {mode === 'custom' && (
                <input
                  type="text"
                  value={label}
                  onChange={(event) => {
                    onLabelChange(event.target.value);
                  }}
                  autoFocus
                  placeholder="Type label name..."
                  className="h-10 w-full rounded-lg border border-brand/15 bg-brand/5 px-3 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-brand/60 focus-visible:ring-2 focus-visible:ring-brand/35"
                />
              )}
            </div>

            <label
              htmlFor={'contact-notes-' + conversation.id}
              className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <StickyNoteIcon className="size-4 text-brand/75" />
              Internal notes
            </label>
            <textarea
              id={'contact-notes-' + conversation.id}
              value={notes}
              onChange={(event) => {
                onNotesChange(event.target.value);
              }}
              placeholder="Add a brief note for the admin team"
              rows={2}
              className="mt-3 w-full resize-none rounded-lg border border-brand/15 bg-brand/5 px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-brand/60 focus-visible:ring-2 focus-visible:ring-brand/35 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden field-sizing-content"
            />

            <p className="mt-3 text-xs text-brand/70 leading-relaxed">
              Label and notes data are currently saved temporarily in the chat
              view.
            </p>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
