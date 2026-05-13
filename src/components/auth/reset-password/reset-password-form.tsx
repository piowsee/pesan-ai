'use client';

import {
  type ResetPasswordFormCopy,
  resetPasswordFormCopy,
} from '@/components/auth/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/auth-client';
import type { AppLocale } from '@/lib/locale';
import { toLocalePath } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

function createResetPasswordSchema(copy: ResetPasswordFormCopy) {
  return z
    .object({
      password: z
        .string()
        .min(1, copy.errors.passwordRequired)
        .min(8, copy.errors.passwordLength),
      confirmPassword: z.string().min(1, copy.errors.confirmPasswordRequired),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ['confirmPassword'],
      message: copy.errors.passwordMismatch,
    });
}

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

type Props = {
  locale: AppLocale;
};

export function ResetPasswordForm({ locale }: Props) {
  const copy = resetPasswordFormCopy[locale];
  const loginHref = toLocalePath(locale, '/login');
  const forgotPasswordHref = toLocalePath(locale, '/forgot-password');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createResetPasswordSchema(copy), [copy]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setFormError(copy.errors.invalidToken);
      return;
    }

    setIsPending(true);
    setFormError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });

      if (result?.error) {
        setFormError(result.error.message || copy.errors.invalidToken);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setFormError(copy.errors.unknownError);
    } finally {
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {copy.labels.invalidTokenTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.labels.invalidTokenMessage}
          </p>
        </div>
        <Button asChild variant="brand" size="lg" className="h-10 w-full">
          <Link href={forgotPasswordHref}>{copy.labels.requestNewLink}</Link>
        </Button>
      </div>
    );
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
        <Label htmlFor="password">{copy.labels.password}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            {...form.register('password')}
            aria-invalid={!!form.formState.errors.password}
            className={cn(
              'h-10 rounded-md pr-10 shadow-sm',
              form.formState.errors.password &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder={copy.labels.passwordPlaceholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
            aria-label={
              showPassword ? copy.labels.hidePassword : copy.labels.showPassword
            }
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">{copy.labels.confirmPassword}</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...form.register('confirmPassword')}
            aria-invalid={!!form.formState.errors.confirmPassword}
            className={cn(
              'h-10 rounded-md pr-10 shadow-sm',
              form.formState.errors.confirmPassword &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder={copy.labels.confirmPasswordPlaceholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
            aria-label={
              showConfirmPassword
                ? copy.labels.hidePassword
                : copy.labels.showPassword
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {form.formState.errors.confirmPassword.message}
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

      <Button asChild variant="ghost" size="lg" className="h-10 w-full">
        <Link href={loginHref}>{copy.labels.backToLogin}</Link>
      </Button>
    </form>
  );
}
