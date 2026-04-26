'use client';

import { loginFormCopy } from '@/components/auth/content';
import type { LoginFormCopy } from '@/components/auth/content';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/auth-client';
import type { AppLocale } from '@/lib/locale';
import { toLocalePath } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

function createLoginSchema(copy: LoginFormCopy) {
  return z.object({
    email: z.email(copy.errors.invalidEmail),
    password: z
      .string()
      .min(1, copy.errors.passwordRequired)
      .min(8, copy.errors.passwordLength),
    terms: z.boolean().refine((val) => val === true, {
      message: copy.errors.termsRequired,
    }),
  });
}

type LoginFormValues = {
  email: string;
  password: string;
  terms: boolean;
};

type Props = {
  locale: AppLocale;
};

export function LoginForm({ locale }: Props) {
  const copy = loginFormCopy[locale];

  const termsHref = toLocalePath(locale, '/terms');
  const privacyHref = toLocalePath(locale, '/privacy');

  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createLoginSchema(copy), [copy]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      terms: false,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsPending(true);
    setFormError(null);

    try {
      const result = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
        rememberMe: true,
      });

      if (result?.error) {
        setFormError(result.error.message || copy.errors.invalidCredentials);
        return;
      }

      const isAdmin = result?.data?.user?.role === 'admin';

      const redirectTo = isAdmin ? '/admin' : '/dashboard';
      router.push(redirectTo);
    } catch {
      setFormError(copy.errors.unknownError);
    } finally {
      setIsPending(false);
    }
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{copy.labels.password}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
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
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-transparent"
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
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name="terms"
            render={({ field }) => (
              <Checkbox
                id="terms"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-1 shrink-0 cursor-pointer"
              />
            )}
          />
          <Label
            htmlFor="terms"
            className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground select-none"
          >
            {copy.labels.agreePrefix}{' '}
            <Link
              href={termsHref}
              className="font-semibold text-brand underline-offset-4 hover:underline cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.labels.terms}
            </Link>{' '}
            {copy.labels.and}{' '}
            <Link
              href={privacyHref}
              className="font-semibold text-brand underline-offset-4 hover:underline cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.labels.privacy}
            </Link>
            .
          </Label>
        </div>

        {form.formState.errors.terms && (
          <p className="text-xs text-destructive">
            {form.formState.errors.terms.message}
          </p>
        )}
      </div>

      {/* Server Error */}
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
    </form>
  );
}
