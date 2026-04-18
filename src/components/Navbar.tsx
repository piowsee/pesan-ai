'use client';

import { Button } from '@/components/ui/button';
import { getLocaleFromPathname, toLocalePath } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { ChevronDown, Globe, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Container } from './Container';

const languageOptions = [
  { label: 'Indonesia', value: 'id' },
  { label: 'English', value: 'en' },
] as const;

type LanguageCode = (typeof languageOptions)[number]['value'];

const navbarCopy = {
  id: {
    login: 'Masuk',
    consultation: 'Konsultasi Sekarang',
    openMenu: 'Buka menu',
    closeMenu: 'Tutup menu',
  },
  en: {
    login: 'Login',
    consultation: 'Book a Consultation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
} as const;

type LanguageDropdownProps = {
  scrolled: boolean;
  locale: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
};

function LanguageDropdown({
  scrolled,
  locale,
  onLanguageChange,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimeout();
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const closeMenu = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, 120);
  }, [clearCloseTimeout]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, [clearCloseTimeout]);

  const activeLanguage =
    languageOptions.find((option) => option.value === locale)?.label ??
    'Indonesia';

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 px-2 text-sm font-semibold transition-colors',
          scrolled
            ? 'text-brand/80 hover:text-brand'
            : 'text-white/85 hover:text-white',
        )}
      >
        <Globe aria-hidden="true" className="size-4" />
        <span>{activeLanguage}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        role="menu"
        className={cn(
          'absolute right-0 top-full z-60 mt-2 min-w-40 bg-background py-1 shadow-md ring-1 ring-brand/20 transition-all duration-150',
          isOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-1 opacity-0',
        )}
      >
        {languageOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitem"
            className={cn(
              'block w-full px-4 py-2.5 text-left text-sm font-medium transition-colors',
              locale === option.value
                ? 'text-brand'
                : 'text-brand/50 hover:text-brand focus:text-brand',
            )}
            onClick={() => {
              onLanguageChange(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type MobileLanguageSelectProps = {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
};

function MobileLanguageSelect({
  language,
  onLanguageChange,
}: MobileLanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeLanguage =
    languageOptions.find((option) => option.value === language)?.label ??
    'Indonesia';

  return (
    <div className="w-full rounded-sm border border-brand/20 bg-brand-foreground">
      <button
        type="button"
        className="inline-flex w-full items-center justify-between px-4 py-3 text-left text-base font-semibold text-brand"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="inline-flex items-center gap-2">
          <Globe aria-hidden="true" className="size-4" />
          {activeLanguage}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden border-t border-brand/15">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'block w-full px-4 py-3 text-left text-sm font-medium transition-colors',
                language === option.value
                  ? 'bg-brand/8 text-brand'
                  : 'text-brand/75 hover:bg-brand/6 hover:text-brand',
              )}
              onClick={() => {
                onLanguageChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = getLocaleFromPathname(pathname);
  const copy = navbarCopy[currentLocale];

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLanguage, setMobileLanguage] =
    useState<LanguageCode>(currentLocale);

  useEffect(() => {
    setMobileLanguage(currentLocale);
  }, [currentLocale]);

  const homeHref = toLocalePath(currentLocale, '/');
  const loginHref = toLocalePath(currentLocale, '/login');

  const handleLanguageChange = useCallback(
    (nextLocale: LanguageCode) => {
      const currentPath = pathname ?? '/';
      const nextPath = toLocalePath(nextLocale, currentPath);

      setMobileLanguage(nextLocale);
      router.push(nextPath);
    },
    [pathname, router],
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 select-none font-sans transition-all duration-300',
          scrolled || mobileMenuOpen
            ? 'bg-background/95 backdrop-blur'
            : 'bg-transparent',
        )}
      >
        <Container className="flex h-18 items-center justify-between gap-4">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2"
            draggable={false}
            onClick={(event) => {
              event.preventDefault();
              window.location.assign(homeHref);
            }}
          >
            <Image
              src={
                scrolled || mobileMenuOpen
                  ? '/pesan-ai-black-logo.png'
                  : '/pesan-ai-logo.png'
              }
              alt="Pesan AI"
              width={120}
              height={28}
              className="h-9 w-auto object-contain"
              priority
              draggable={false}
            />
            <span
              className={cn(
                'mb-1 text-xl font-bold tracking-tight transition-colors',
                scrolled || mobileMenuOpen ? 'text-brand' : 'text-white',
              )}
            >
              pesan.ai
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-2 py-1 sm:gap-3 md:flex">
            <LanguageDropdown
              scrolled={scrolled}
              locale={currentLocale}
              onLanguageChange={handleLanguageChange}
            />

            <Link
              href={loginHref}
              className={cn(
                'inline-flex h-9 items-center px-2 text-sm font-semibold transition-colors',
                scrolled
                  ? 'text-brand/80 hover:text-brand'
                  : 'text-white/85 hover:text-white',
              )}
            >
              {copy.login}
            </Link>

            <Button
              asChild
              size="lg"
              variant="brand"
              className="h-10 rounded-full px-4 sm:px-5"
            >
              <a
                href="https://wa.me/6285129646215"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.consultation}
              </a>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? copy.closeMenu : copy.openMenu}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-lg transition-colors md:hidden',
              scrolled || mobileMenuOpen
                ? 'text-brand hover:bg-brand/10'
                : 'text-white hover:bg-white/10',
            )}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </Container>
      </header>

      {/* Mobile menu overlay */}
      <div
        aria-hidden={!mobileMenuOpen}
        className={cn(
          'fixed inset-x-0 top-18 z-40 border-b border-border bg-background shadow-xl transition-all duration-300 ease-out md:hidden',
          mobileMenuOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-4 opacity-0 pointer-events-none',
        )}
      >
        <nav className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-6">
          <MobileLanguageSelect
            language={mobileLanguage}
            onLanguageChange={handleLanguageChange}
          />

          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-sm border-brand/25 bg-transparent text-base font-semibold text-brand hover:bg-brand/10"
          >
            <Link href={loginHref} onClick={() => setMobileMenuOpen(false)}>
              {copy.login}
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="brand"
            className="h-12 w-full rounded-sm text-base font-semibold"
          >
            <a
              href="https://wa.me/6285129646215"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
            >
              {copy.consultation}
            </a>
          </Button>
        </nav>
      </div>
    </>
  );
}
