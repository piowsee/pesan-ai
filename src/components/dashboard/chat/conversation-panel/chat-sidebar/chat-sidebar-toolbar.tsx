import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatSidebarFilter } from '@/types/chat';
import { SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ChatSidebarToolbar({
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filter: ChatSidebarFilter;
  onFilterChange: (value: ChatSidebarFilter) => void;
}) {
  const t = useTranslations('Chat.sidebar');
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand/70" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('search')}
          className="h-9 border border-brand/20 bg-brand/5 pl-9 placeholder:text-brand/60"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className={
            filter === 'all'
              ? 'h-8 cursor-pointer rounded-full bg-brand/12 px-3 text-brand hover:bg-brand/12'
              : 'h-8 cursor-pointer rounded-full px-3 text-brand/75 hover:bg-brand/8'
          }
          onClick={() => onFilterChange('all')}
        >
          {t('filterAll')}
        </Button>
        <Button
          variant={filter === 'admin' ? 'secondary' : 'ghost'}
          size="sm"
          className={
            filter === 'admin'
              ? 'h-8 cursor-pointer rounded-full bg-brand/12 px-3 text-brand hover:bg-brand/12'
              : 'h-8 cursor-pointer rounded-full px-3 text-brand/75 hover:bg-brand/8'
          }
          onClick={() => onFilterChange('admin')}
        >
          {t('filterAdmin')}
        </Button>
        <Button
          variant={filter === 'bot' ? 'secondary' : 'ghost'}
          size="sm"
          className={
            filter === 'bot'
              ? 'h-8 cursor-pointer rounded-full bg-brand/12 px-3 text-brand hover:bg-brand/12'
              : 'h-8 cursor-pointer rounded-full px-3 text-brand/75 hover:bg-brand/8'
          }
          onClick={() => onFilterChange('bot')}
        >
          {t('filterBot')}
        </Button>
      </div>
    </div>
  );
}
