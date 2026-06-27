'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRequestAccount } from '@/hooks/use-request-account';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type ContactUsFormLabels = {
  name: string;
  namePlaceholder: string;
  companyName: string;
  companyNamePlaceholder: string;
  phoneNumber: string;
  phoneNumberPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  backToLogin: string;
  successTitle: string;
  successMessage: string;
};

type ContactUsFormErrors = {
  nameRequired: string;
  nameLength: string;
  invalidEmail: string;
  emailLength: string;
  companyNameLength: string;
  phoneNumberLength: string;
  phoneNumberDigits: string;
  messageLength: string;
  unknownError: string;
};

function createContactUsSchema(errors: ContactUsFormErrors) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, errors.nameRequired)
      .max(120, errors.nameLength),
    email: z
      .string()
      .trim()
      .email(errors.invalidEmail)
      .max(160, errors.emailLength),
    companyName: z.string().trim().max(160, errors.companyNameLength),
    phoneNumber: z
      .string()
      .trim()
      .max(40, errors.phoneNumberLength)
      .regex(/^\d*$/, errors.phoneNumberDigits),
    message: z.string().trim().max(1000, errors.messageLength),
  });
}

type ContactUsFormValues = {
  name: string;
  email: string;
  companyName: string;
  phoneNumber: string;
  message: string;
};

export function ContactUsForm() {
  const commonT = useTranslations('Auth.forms.common');
  const t = useTranslations('Auth.forms.contactUs');
  const labels = t.raw('labels') as ContactUsFormLabels;
  const errors = t.raw('errors') as ContactUsFormErrors;

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const requestAccountMutation = useRequestAccount();

  const schema = useMemo(() => createContactUsSchema(errors), [errors]);

  const form = useForm<ContactUsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      companyName: '',
      phoneNumber: '',
      message: '',
    },
  });

  async function onSubmit(values: ContactUsFormValues) {
    setFormError(null);

    try {
      await requestAccountMutation.mutateAsync(values);
      setIsSubmitted(true);
      form.reset();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : errors.unknownError,
      );
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-foreground">
            {labels.successTitle}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {labels.successMessage}
          </p>
        </div>
        <Button asChild variant="brand" size="lg" className="h-10 w-full">
          <Link href="/login">{labels.backToLogin}</Link>
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
        <Label htmlFor="name">
          {labels.name}
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </Label>
        <Input
          id="name"
          autoComplete="name"
          autoFocus
          required
          {...form.register('name')}
          aria-required="true"
          aria-invalid={!!form.formState.errors.name}
          className={cn(
            'h-10 rounded-md shadow-sm',
            form.formState.errors.name &&
              'border-destructive focus-visible:ring-destructive/20',
          )}
          placeholder={labels.namePlaceholder}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">
          {commonT('emailLabel')}
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          {...form.register('email')}
          aria-required="true"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyName">{labels.companyName}</Label>
          <Input
            id="companyName"
            autoComplete="organization"
            {...form.register('companyName')}
            aria-invalid={!!form.formState.errors.companyName}
            className={cn(
              'h-10 rounded-md shadow-sm',
              form.formState.errors.companyName &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder={labels.companyNamePlaceholder}
          />
          {form.formState.errors.companyName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.companyName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phoneNumber">{labels.phoneNumber}</Label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel"
            onInput={(event) => {
              event.currentTarget.value = event.currentTarget.value.replace(
                /\D/g,
                '',
              );
            }}
            {...form.register('phoneNumber', {
              setValueAs: (value) =>
                typeof value === 'string' ? value.replace(/\D/g, '') : value,
            })}
            aria-invalid={!!form.formState.errors.phoneNumber}
            className={cn(
              'h-10 rounded-md shadow-sm',
              form.formState.errors.phoneNumber &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder={labels.phoneNumberPlaceholder}
          />
          {form.formState.errors.phoneNumber && (
            <p className="text-xs text-destructive">
              {form.formState.errors.phoneNumber.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">{labels.message}</Label>
        <Textarea
          id="message"
          {...form.register('message')}
          aria-invalid={!!form.formState.errors.message}
          className={cn(
            'min-h-28 rounded-md shadow-sm',
            form.formState.errors.message &&
              'border-destructive focus-visible:ring-destructive/20',
          )}
          placeholder={labels.messagePlaceholder}
        />
        {form.formState.errors.message && (
          <p className="text-xs text-destructive">
            {form.formState.errors.message.message}
          </p>
        )}
      </div>

      {formError && <p className="text-xs text-destructive">{formError}</p>}

      <Button
        type="submit"
        variant="brand"
        size="lg"
        disabled={requestAccountMutation.isPending}
        className="mt-2 h-10 w-full rounded-md shadow-sm"
      >
        {requestAccountMutation.isPending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : null}
        {requestAccountMutation.isPending ? labels.submitting : labels.submit}
      </Button>

      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-10 w-full border-border/70 bg-background/70 px-3 shadow-sm hover:bg-muted/70"
      >
        <Link href="/login">{labels.backToLogin}</Link>
      </Button>
    </form>
  );
}
