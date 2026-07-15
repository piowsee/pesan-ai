'use client';

import { Link, useRouter } from '@/i18n/navigation';
import type { ComponentProps, MouseEvent } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function AuthTransitionLink({ href, onClick, target, ...props }: Props) {
  const router = useRouter();

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === '_blank'
    ) {
      return;
    }

    event.preventDefault();

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    window.dispatchEvent(
      new CustomEvent('auth-panel-leave', { detail: { href } }),
    );

    window.setTimeout(
      () => {
        router.push(href);
      },
      prefersReducedMotion ? 0 : 150,
    );
  }

  return <Link href={href} target={target} onClick={handleClick} {...props} />;
}
