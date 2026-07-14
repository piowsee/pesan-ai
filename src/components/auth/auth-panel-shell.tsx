'use client';

import { AuthTransitionLink } from '@/components/auth/auth-transition-link';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

type Props = {
  children: ReactNode;
};

export function AuthPanelShell({ children }: Props) {
  const pathname = usePathname();
  const t = useTranslations('Auth.panelSwitch');
  const prefersReducedMotion = useReducedMotion();
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  const isContactPage = pathname.endsWith('/contact-us');
  const isLoginPage = pathname.endsWith('/login');
  const showPanelSwitch = isLoginPage;
  const panelKey = isContactPage ? 'contact-us' : pathname;

  useEffect(() => {
    if (!isLoginPage) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get('session_expired') !== 'true') {
      return;
    }

    params.delete('session_expired');

    const cleanSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', cleanUrl);
  }, [isLoginPage]);

  const transition = useMemo(
    () => ({
      opacity: prefersReducedMotion ? '0ms' : '150ms',
      filter: prefersReducedMotion ? '0ms' : '200ms',
    }),
    [prefersReducedMotion],
  );

  useEffect(() => {
    let timeoutId: number;

    function handleLeave() {
      if (prefersReducedMotion) {
        setIsPanelVisible(false);
      } else {
        timeoutId = window.setTimeout(() => {
          setIsPanelVisible(false);
        }, 40);
      }
    }

    window.addEventListener('auth-panel-leave', handleLeave);

    return () => {
      window.removeEventListener('auth-panel-leave', handleLeave);
      window.clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setIsPanelVisible(true);
      },
      prefersReducedMotion ? 0 : 40,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname, prefersReducedMotion]);

  return (
    <div className="relative w-full">
      <div
        key={panelKey}
        className="relative flex min-h-svh w-full items-center justify-center px-0 py-20 sm:py-16"
        style={{
          opacity: isPanelVisible ? 1 : 0,
          filter: isPanelVisible ? 'blur(0px)' : 'blur(12px)',
          transition: `opacity ${transition.opacity} cubic-bezier(0.22, 1, 0.36, 1), filter ${transition.filter} cubic-bezier(0.22, 1, 0.36, 1)`,
          willChange: prefersReducedMotion ? 'auto' : 'opacity, filter',
        }}
      >
        {showPanelSwitch ? (
          <div className="absolute inset-x-0 top-7 z-20 flex justify-center sm:top-9">
            <p
              className={cn(
                'w-full max-w-md text-right text-muted-foreground xl:max-w-xl',
                isContactPage ? 'text-xs' : 'text-sm',
              )}
            >
              <span>
                {isContactPage ? t('loginPrompt') : t('contactPrompt')}
              </span>{' '}
              <AuthTransitionLink
                href="/contact-us"
                className="font-semibold text-brand underline-offset-4 transition-colors hover:text-brand/80 hover:underline"
              >
                {t('contactAction')}
              </AuthTransitionLink>
            </p>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
