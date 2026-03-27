import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChatSidebarFilter } from '@/types/chat';
import { SearchIcon } from 'lucide-react';

export function ChatSidebarToolbar({
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
  phoneNumbers,
  selectedPhoneNumberId,
  onPhoneNumberChange,
  allCount = 0,
  unreadCount = 0,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filter: ChatSidebarFilter;
  onFilterChange: (value: ChatSidebarFilter) => void;
  phoneNumbers: Array<{ id: string; displayPhoneNumber: string }>;
  selectedPhoneNumberId?: string;
  onPhoneNumberChange: (value?: string) => void;
  allCount?: number;
  unreadCount?: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4">
      {/*
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-bold tracking-tight">Chats</div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
          {isConnected ? <WifiIcon className="size-3" /> : <WifiOffIcon className="size-3" />}
          <span>{isConnected ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      */}

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground size-4" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search number or name"
          className="pl-9 h-9 bg-muted/30 border-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className={
            filter === 'all'
              ? 'h-8 px-3 rounded-full cursor-pointer'
              : 'h-8 px-3 rounded-full text-muted-foreground cursor-pointer'
          }
          onClick={() => onFilterChange('all')}
        >
          All
          <span className="ml-1.5 flex h-5 items-center justify-center rounded-full bg-muted-foreground/15 px-2 text-[10px] font-medium text-muted-foreground">
            {allCount}
          </span>
        </Button>
        <Button
          variant={filter === 'unread' ? 'secondary' : 'ghost'}
          size="sm"
          className={
            filter === 'unread'
              ? 'h-8 px-3 rounded-full cursor-pointer'
              : 'h-8 px-3 rounded-full text-muted-foreground cursor-pointer'
          }
          onClick={() => onFilterChange('unread')}
        >
          Unread
          <span className="ml-1.5 flex h-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-medium text-primary">
            {unreadCount}
          </span>
        </Button>

        <Select
          value={selectedPhoneNumberId ?? 'all'}
          onValueChange={(value: string) =>
            onPhoneNumberChange(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="ml-auto h-8 w-[170px] cursor-pointer gap-2 rounded-full border-none bg-muted/30 px-3 transition-colors hover:bg-muted/50 [&>span]:block [&>span]:truncate">
            <SelectValue placeholder="All Phones" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Phones</SelectItem>
              {phoneNumbers.map((phoneNumber) => (
                <SelectItem key={phoneNumber.id} value={phoneNumber.id}>
                  {phoneNumber.displayPhoneNumber}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
