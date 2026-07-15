'use client';

import { AuthTransitionLink } from '@/components/auth/auth-transition-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type ResetPasswordLabels = {
  password: string;
  confirmPassword: string;
  submit: string;
  submitting: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  hidePassword: string;
  showPassword: string;
  backToLogin: string;
  successTitle: string;
  successMessage: string;
  invalidTokenTitle: string;
  invalidTokenMessage: string;
  requestNewLink: string;
};

type ResetPasswordErrors = {
  passwordRequired: string;
  passwordLength: string;
  confirmPasswordRequired: string;
  passwordMismatch: string;
  invalidToken: string;
  unknownError: string;
};

function createResetPasswordSchema(errors: ResetPasswordErrors) {
  return z
    .object({
      password: z
        .string()
        .min(1, errors.passwordRequired)
        .min(8, errors.passwordLength),
      confirmPassword: z.string().min(1, errors.confirmPasswordRequired),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ['confirmPassword'],
      message: errors.passwordMismatch,
    });
}

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordForm() {
  const t = useTranslations('Auth.forms.resetPassword');
  const labels = t.raw('labels') as ResetPasswordLabels;
  const errors = t.raw('errors') as ResetPasswordErrors;
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createResetPasswordSchema(errors), [errors]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setFormError(errors.invalidToken);
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
        setFormError(result.error.message || errors.invalidToken);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setFormError(errors.unknownError);
    } finally {
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {labels.invalidTokenTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {labels.invalidTokenMessage}
          </p>
        </div>
        <Button asChild variant="brand" size="lg" className="h-10 w-full">
          <AuthTransitionLink href="/forgot-password">
            {labels.requestNewLink}
          </AuthTransitionLink>
        </Button>
      </div>
    );
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
        <Label htmlFor="password">{labels.password}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            {...form.register('password')}
            aria-invalid={!!form.formState.errors.password}
            className={cn(
              'h-10 rounded-md pr-10',
              form.formState.errors.password &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder={labels.passwordPlaceholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
            aria-label={
              showPassword ? labels.hidePassword : labels.showPassword
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
        <Label htmlFor="confirmPassword">{labels.confirmPassword}</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...form.register('confirmPassword')}
            aria-invalid={!!form.formState.errors.confirmPassword}
            className={cn(
              'h-10 rounded-md pr-10',
              form.formState.errors.confirmPassword &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder={labels.confirmPasswordPlaceholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
            aria-label={
              showConfirmPassword ? labels.hidePassword : labels.showPassword
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
        className="mt-2 h-10 w-full rounded-md"
      >
        {isPending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : null}
        {isPending ? labels.submitting : labels.submit}
      </Button>

      <Button asChild variant="ghost" size="lg" className="h-10 w-full">
        <AuthTransitionLink href="/login">
          {labels.backToLogin}
        </AuthTransitionLink>
      </Button>
    </form>
  );
}
