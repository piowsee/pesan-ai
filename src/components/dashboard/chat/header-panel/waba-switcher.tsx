'use client';

import { SingleSelectOption } from '@/components/dashboard/chat/header-panel/single-select-option';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type Waba } from '@/hooks/use-wabas';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';

function getWabaLabel(waba: Waba) {
  return waba.name?.trim() || waba.wabaId;
}

export function WabaSwitcher({
  wabas,
  activeWabaId,
  onSelectWaba,
}: {
  wabas: Waba[];
  activeWabaId?: string;
  onSelectWaba: (wabaId: string) => void;
}) {
  const t = useTranslations('Chat.wabaSwitcher');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const activeWaba = wabas.find((waba) => waba.id === activeWabaId);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWabas = normalizedQuery
    ? wabas.filter((waba) => {
        const phoneNumbers = waba.phoneNumbers
          .map((phoneNumber) => phoneNumber.displayPhoneNumber)
          .join(' ');

        return `${getWabaLabel(waba)} ${phoneNumbers}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
    : wabas;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          type="button"
          className="flex h-7 max-w-44 cursor-pointer items-center gap-1.5 px-0 text-left text-foreground/60 hover:bg-transparent hover:text-brand focus-visible:text-brand data-[state=open]:text-brand"
        >
          <FaWhatsapp className="size-3.5 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">
              {activeWaba ? getWabaLabel(activeWaba) : t('select')}
            </div>
          </div>
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
          {filteredWabas.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t('noMatch')}
            </p>
          ) : (
            filteredWabas.map((waba) => {
              const isSelected = activeWabaId === waba.id;

              return (
                <SingleSelectOption
                  key={waba.id}
                  isSelected={isSelected}
                  icon={<FaWhatsapp className="size-4" />}
                  label={getWabaLabel(waba)}
                  description={
                    waba.phoneNumbers
                      .map((phoneNumber) => phoneNumber.displayPhoneNumber)
                      .join(', ') || t('noNumbers')
                  }
                  onSelect={() => {
                    if (!isSelected) {
                      onSelectWaba(waba.id);
                    }
                    setOpen(false);
                    setQuery('');
                  }}
                />
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
