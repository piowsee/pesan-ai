import { Tabs, TabsList, TabsTrigger } from '@/components/motion/tabs';
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
    <div className="flex flex-col pt-2">
      <div className="px-4 pb-1.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('search')}
            className="h-9 bg-background pl-9"
          />
        </div>
      </div>

      <div className="flex items-center">
        <Tabs
          value={filter}
          onValueChange={(v) => onFilterChange(v as ChatSidebarFilter)}
          variant="underline"
          className="w-full"
        >
          <TabsList className="flex w-full px-4">
            <TabsTrigger
              value="all"
              className="flex-1 cursor-pointer justify-center text-muted-foreground hover:text-foreground aria-selected:text-brand aria-selected:hover:text-brand"
              indicatorClassName="bg-brand h-0.5"
            >
              {t('filterAll')}
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="flex-1 cursor-pointer justify-center text-muted-foreground hover:text-foreground aria-selected:text-brand aria-selected:hover:text-brand"
              indicatorClassName="bg-brand h-0.5"
            >
              {t('filterAdmin')}
            </TabsTrigger>
            <TabsTrigger
              value="bot"
              className="flex-1 cursor-pointer justify-center text-muted-foreground hover:text-foreground aria-selected:text-brand aria-selected:hover:text-brand"
              indicatorClassName="bg-brand h-0.5"
            >
              {t('filterBot')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
