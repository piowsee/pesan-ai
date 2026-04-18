import { SUPPORTED_LOCALES } from '@/lib/locale';
import type { ReactNode } from 'react';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
};

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  return children;
}
