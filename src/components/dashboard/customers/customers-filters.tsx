import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { type Waba } from '@/hooks/use-wabas';
import { ChevronDown, Phone, X } from 'lucide-react';
import { type ReactNode } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';

import { type PhoneFilterOption, getWabaLabel } from './customers-utils';

function FilterPopover({
  title,
  triggerLabel,
  icon,
  disabled,
  children,
}: {
  title: string;
  triggerLabel: string;
  icon: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-between border-brand/20 text-brand hover:bg-muted hover:text-brand sm:w-auto sm:min-w-48"
          disabled={disabled}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-lg p-2">
        <div className="px-2 py-2 text-xs font-semibold tracking-[0.12em] text-brand uppercase">
          {title}
        </div>
        <div className="max-h-72 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CheckboxRow({
  checked,
  label,
  description,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-brand transition hover:bg-muted/60">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {description ? (
          <span className="block truncate text-xs text-brand/70">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function CustomersFilters({
  wabas,
  activeWabaIdSet,
  selectedWabaIds,
  phoneOptions,
  activePhoneOptions,
  selectedPhoneIds,
  wabaLabel,
  numberLabel,
  isWabaLoading,
  hasFilters,
  onToggleAllWabas,
  onToggleWaba,
  onToggleAllNumbers,
  onToggleNumber,
  onClearFilters,
}: {
  wabas: Waba[];
  activeWabaIdSet: Set<string>;
  selectedWabaIds: string[] | null;
  phoneOptions: PhoneFilterOption[];
  activePhoneOptions: PhoneFilterOption[];
  selectedPhoneIds: string[] | null;
  wabaLabel: string;
  numberLabel: string;
  isWabaLoading: boolean;
  hasFilters: boolean;
  onToggleAllWabas: (checked: boolean) => void;
  onToggleWaba: (wabaId: string, checked: boolean) => void;
  onToggleAllNumbers: (checked: boolean) => void;
  onToggleNumber: (phoneId: string, checked: boolean) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <FilterPopover
        title="Filter WABA"
        triggerLabel={wabaLabel}
        icon={<FaWhatsapp data-icon="inline-start" />}
        disabled={isWabaLoading && wabas.length === 0}
      >
        <CheckboxRow
          checked={selectedWabaIds === null}
          label="Select all"
          onCheckedChange={onToggleAllWabas}
        />
        <div className="my-1 h-px bg-border" />
        {wabas.length === 0 ? (
          <p className="px-2 py-3 text-sm text-brand/70">No WABA available.</p>
        ) : (
          wabas.map((waba) => (
            <CheckboxRow
              key={waba.id}
              checked={activeWabaIdSet.has(waba.id)}
              label={getWabaLabel(waba)}
              description={waba.wabaId}
              onCheckedChange={(checked) => onToggleWaba(waba.id, checked)}
            />
          ))
        )}
      </FilterPopover>

      <FilterPopover
        title="Filter Number"
        triggerLabel={numberLabel}
        icon={<Phone data-icon="inline-start" />}
        disabled={phoneOptions.length === 0}
      >
        <CheckboxRow
          checked={selectedPhoneIds === null}
          label="Select all"
          onCheckedChange={onToggleAllNumbers}
        />
        <div className="my-1 h-px bg-border" />
        {phoneOptions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-brand/70">
            No number available for the selected WABA.
          </p>
        ) : (
          phoneOptions.map((phone) => (
            <CheckboxRow
              key={phone.id}
              checked={activePhoneOptions.some(
                (activePhone) => activePhone.id === phone.id,
              )}
              label={phone.displayPhoneNumber}
              description={phone.wabaLabel}
              onCheckedChange={(checked) => onToggleNumber(phone.id, checked)}
            />
          ))
        )}
      </FilterPopover>

      <Button
        variant="outline"
        size="lg"
        className="border-brand/20 text-brand hover:bg-muted hover:text-brand"
        disabled={!hasFilters}
        onClick={onClearFilters}
      >
        <X data-icon="inline-start" />
        Clear
      </Button>
    </div>
  );
}
