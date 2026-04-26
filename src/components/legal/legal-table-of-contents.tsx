import { cn } from '@/lib/utils';
import Link from 'next/link';

type Item = {
  id: string;
  label: string;
};

type Props = {
  title: string;
  items: Item[];
  activeSection: string;
};

export function LegalTableOfContents({ title, items, activeSection }: Props) {
  return (
    <aside className="sticky top-30 hidden h-fit md:block">
      <h3 className="mb-5 text-sm font-semibold text-brand">{title}</h3>

      <ul className="space-y-3 text-sm text-brand/70">
        {items.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <li key={item.id}>
              <Link
                href={`#${item.id}`}
                className={cn(
                  'transition',
                  isActive ? 'text-brand' : 'text-brand/70 hover:text-brand',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
