'use client';

import {
  type ForgotPasswordFormCopy,
  forgotPasswordFormCopy,
} from '@/components/auth/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/auth-client';
import type { AppLocale } from '@/lib/locale';
import { toLocalePath } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

function createForgotPasswordSchema(copy: ForgotPasswordFormCopy) {
  return z.object({
    email: z.email(copy.errors.invalidEmail),
  });
}

type ForgotPasswordFormValues = {
  email: string;
};

type Props = {
  locale: AppLocale;
};

export function ForgotPasswordForm({ locale }: Props) {
  const copy = forgotPasswordFormCopy[locale];
  const loginHref = toLocalePath(locale, '/login');
  const resetPasswordHref = toLocalePath(locale, '/reset-password');

  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createForgotPasswordSchema(copy), [copy]);

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
        setFormError(result.error.message || copy.errors.unknownError);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setFormError(copy.errors.unknownError);
    } finally {
      setIsPending(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {copy.labels.successTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.labels.successMessage}
          </p>
        </div>
        <Button asChild variant="brand" size="lg" className="h-10 w-full">
          <Link href={loginHref}>{copy.labels.backToLogin}</Link>
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          {...form.register('email')}
          aria-invalid={!!form.formState.errors.email}
          className={cn(
            'h-10 rounded-md shadow-sm',
            form.formState.errors.email &&
              'border-destructive focus-visible:ring-destructive/20',
          )}
          placeholder="name@company.com"
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
        className="mt-2 h-10 w-full rounded-md shadow-sm"
      >
        {isPending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : null}
        {isPending ? copy.labels.submitting : copy.labels.submit}
      </Button>

      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-10 w-full border-border/70 bg-background/70 px-3 shadow-sm hover:bg-muted/70"
      >
        <Link href={loginHref}>{copy.labels.backToLogin}</Link>
      </Button>
    </form>
  );
}
