'use client';

import { SingleSelectOption } from '@/components/dashboard/chat/header-panel/single-select-option';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronDownIcon,
  ListFilterIcon,
  PhoneIcon,
  SearchIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type PhoneNumberOption = {
  id: string;
  displayPhoneNumber: string;
};

export function PhoneNumberFilter({
  disabled,
  phoneNumbers,
  selectedPhoneNumberId,
  onPhoneNumberChange,
}: {
  disabled: boolean;
  phoneNumbers: PhoneNumberOption[];
  selectedPhoneNumberId?: string;
  onPhoneNumberChange: (value?: string) => void;
}) {
  const t = useTranslations('Chat.phoneFilter');
  const tSidebar = useTranslations('Chat.sidebar');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedLabel =
    phoneNumbers.find((phoneNumber) => phoneNumber.id === selectedPhoneNumberId)
      ?.displayPhoneNumber ?? tSidebar('allPhones');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPhoneNumbers = useMemo(
    () =>
      normalizedQuery
        ? phoneNumbers.filter((phoneNumber) =>
            phoneNumber.displayPhoneNumber
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : phoneNumbers,
    [normalizedQuery, phoneNumbers],
  );

  function selectPhoneNumber(phoneNumberId?: string) {
    onPhoneNumberChange(phoneNumberId);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          type="button"
          disabled={disabled}
          className="flex h-10 max-w-40 cursor-pointer items-center gap-1.5 rounded-lg border border-brand/10 bg-background px-3 text-left text-foreground/70 shadow-xs hover:border-brand/20 hover:text-brand focus-visible:text-brand data-[state=open]:border-brand/20 data-[state=open]:text-brand disabled:text-muted-foreground"
        >
          <PhoneIcon className="size-3.5 shrink-0" />
          <span className="truncate text-xs font-semibold">
            {selectedLabel}
          </span>
          <ChevronDownIcon className="size-3 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-background p-0 text-foreground shadow-lg"
      >
        <div className="px-3 pt-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {t('title')}
        </div>
        <div className="relative px-3 pb-3">
          <SearchIcon className="pointer-events-none absolute top-4.5 left-6 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search')}
            className="h-9 bg-background py-1 pr-3 pl-9 text-xs shadow-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-2">
          <SingleSelectOption
            isSelected={!selectedPhoneNumberId}
            icon={<ListFilterIcon className="size-4" />}
            label={tSidebar('allPhones')}
            onSelect={() => selectPhoneNumber()}
          />

          {filteredPhoneNumbers.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t('noMatch')}
            </p>
          ) : (
            filteredPhoneNumbers.map((phoneNumber) => {
              const isSelected = selectedPhoneNumberId === phoneNumber.id;

              return (
                <SingleSelectOption
                  key={phoneNumber.id}
                  isSelected={isSelected}
                  icon={<PhoneIcon className="size-4" />}
                  label={phoneNumber.displayPhoneNumber}
                  onSelect={() => selectPhoneNumber(phoneNumber.id)}
                />
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
