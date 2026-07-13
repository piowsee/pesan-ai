'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type Waba } from '@/hooks/use-wabas';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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
          className="ml-4 flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-left shadow-sm transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">
                {activeWaba ? getWabaLabel(activeWaba) : t('select')}
              </div>
            </div>
          </div>
          <ChevronDownIcon className="text-muted-foreground size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(30rem,calc(100vw-2rem))] p-0"
      >
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t('search')}
          />
          <CommandList>
            {filteredWabas.length === 0 ? (
              <CommandEmpty>{t('noMatch')}</CommandEmpty>
            ) : (
              <CommandGroup className="p-1">
                {filteredWabas.map((waba, index) => (
                  <div key={waba.id}>
                    {index > 0 ? <CommandSeparator /> : null}
                    <CommandItem
                      onSelect={() => {
                        if (waba.id !== activeWabaId) {
                          onSelectWaba(waba.id);
                        }
                        setOpen(false);
                        setQuery('');
                      }}
                      className="justify-between cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {getWabaLabel(waba)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {waba.phoneNumbers
                            .map(
                              (phoneNumber) => phoneNumber.displayPhoneNumber,
                            )
                            .join(', ') || t('noNumbers')}
                        </div>
                      </div>
                      <CheckIcon
                        className={cn(
                          activeWabaId === waba.id
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  </div>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
