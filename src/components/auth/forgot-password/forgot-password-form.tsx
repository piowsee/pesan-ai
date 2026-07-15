'use client';

import { AuthTransitionLink } from '@/components/auth/auth-transition-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type LanguageCode = (typeof routing.locales)[number];

type ForgotPasswordLabels = {
  submit: string;
  submitting: string;
  backToLogin: string;
  successTitle: string;
  successMessage: string;
};

type ForgotPasswordErrors = {
  invalidEmail: string;
  unknownError: string;
};

function createForgotPasswordSchema(errors: ForgotPasswordErrors) {
  return z.object({
    email: z.email(errors.invalidEmail),
  });
}

type ForgotPasswordFormValues = {
  email: string;
};

export function ForgotPasswordForm() {
  const locale = useLocale() as LanguageCode;
  const commonT = useTranslations('Auth.forms.common');
  const t = useTranslations('Auth.forms.forgotPassword');
  const labels = t.raw('labels') as ForgotPasswordLabels;
  const errors = t.raw('errors') as ForgotPasswordErrors;
  const resetPasswordHref = getPathname({
    href: '/reset-password',
    locale,
  });

  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createForgotPasswordSchema(errors), [errors]);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsPending(true);
    setFormError(null);

    try {
      const result = await authClient.requestPasswordReset({
        email: values.email.trim(),
        redirectTo: resetPasswordHref,
      });

      if (result?.error) {
        setFormError(result.error.message || errors.unknownError);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setFormError(errors.unknownError);
    } finally {
      setIsPending(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {labels.successTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {labels.successMessage}
          </p>
        </div>
        <Button asChild variant="brand" size="lg" className="h-10 w-full">
          <AuthTransitionLink href="/login">
            {labels.backToLogin}
          </AuthTransitionLink>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{commonT('emailLabel')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          {...form.register('email')}
          aria-invalid={!!form.formState.errors.email}
          className={cn(
            'h-10 rounded-md',
            form.formState.errors.email &&
              'border-destructive focus-visible:ring-destructive/20',
          )}
          placeholder={commonT('emailPlaceholder')}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {formError && <p className="text-xs text-destructive">{formError}</p>}

      <Button
        type="submit"
        variant="brand"
        size="lg"
        disabled={isPending}
        className="mt-2 h-10 w-full rounded-md"
      >
        {isPending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : null}
        {isPending ? labels.submitting : labels.submit}
      </Button>

      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-10 w-full border-border/70 bg-background/70 px-3 hover:bg-muted/70"
      >
        <AuthTransitionLink href="/login">
          {labels.backToLogin}
        </AuthTransitionLink>
      </Button>
    </form>
  );
}
