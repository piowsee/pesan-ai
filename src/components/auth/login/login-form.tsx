'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type LoginFormLabels = {
  password: string;
  forgotPassword: string;
  contactUs: string;
  agreePrefix: string;
  terms: string;
  and: string;
  privacy: string;
  submit: string;
  submitting: string;
  passwordPlaceholder: string;
  hidePassword: string;
  showPassword: string;
};

type LoginFormErrors = {
  invalidEmail: string;
  passwordRequired: string;
  passwordLength: string;
  termsRequired: string;
  unknownError: string;
};

function createLoginSchema(errors: LoginFormErrors) {
  return z.object({
    email: z.email(errors.invalidEmail),
    password: z
      .string()
      .min(1, errors.passwordRequired)
      .min(8, errors.passwordLength),
  });
}

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const commonT = useTranslations('Auth.forms.common');
  const t = useTranslations('Auth.forms.login');
  const labels = t.raw('labels') as LoginFormLabels;
  const errors = t.raw('errors') as LoginFormErrors;

  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createLoginSchema(errors), [errors]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
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
        setFormError(result.error.message || errors.unknownError);
        return;
      }

      const isAdmin = result?.data?.user?.role === 'admin';

      const redirectTo = isAdmin ? '/admin' : '/dashboard';
      router.push(redirectTo);
    } catch {
      setFormError(errors.unknownError);
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
        <Label htmlFor="email">{commonT('emailLabel')}</Label>
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
          placeholder={commonT('emailPlaceholder')}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{labels.password}</Label>
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
            placeholder={labels.passwordPlaceholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-transparent"
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
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand underline-offset-4 transition-colors hover:underline"
          >
            {labels.forgotPassword}
          </Link>
        </div>
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
        {isPending ? labels.submitting : labels.submit}
      </Button>

      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-10 w-full border-border/70 bg-background/70 px-3 shadow-sm hover:bg-muted/70"
      >
        <Link href="/contact-us">{labels.contactUs}</Link>
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-2">
        {labels.agreePrefix}{' '}
        <Link
          href="/terms"
          className="font-semibold text-brand underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {labels.terms}
        </Link>{' '}
        {labels.and}{' '}
        <Link
          href="/privacy"
          className="font-semibold text-brand underline-offset-4 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {labels.privacy}
        </Link>
        .
      </p>
    </form>
  );
}
