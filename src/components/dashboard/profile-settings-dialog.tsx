'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type ProfileSettingsLabels = {
  title: string;
  description: string;
  name: string;
  email: string;
  warning: string;
  save: string;
  saving: string;
};

type ProfileSettingsErrors = {
  nameRequired: string;
  nameLength: string;
  emailRequired: string;
  invalidEmail: string;
  emailLength: string;
  failedSaveName: string;
  failedChangeEmail: string;
  failedSave: string;
};

function createProfileSchema(errors: ProfileSettingsErrors) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, errors.nameRequired)
      .max(80, errors.nameLength),
    email: z
      .string()
      .trim()
      .min(1, errors.emailRequired)
      .email(errors.invalidEmail)
      .max(255, errors.emailLength),
  });
}

type ProfileFormValues = {
  name: string;
  email: string;
};

type ProfileSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
};

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  user,
}: ProfileSettingsDialogProps) {
  const router = useRouter();
  const t = useTranslations('ProfileSettingsDialog');
  const labels = t.raw('labels') as ProfileSettingsLabels;
  const errors = t.raw('errors') as ProfileSettingsErrors;

  const schema = useMemo(() => createProfileSchema(errors), [errors]);

  const wasOpenRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentName, setCurrentName] = useState(user.name);
  const [currentEmail, setCurrentEmail] = useState(user.email);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  const watchedName = form.watch('name');
  const watchedEmail = form.watch('email');
  const normalizedCurrentName = currentName.trim();
  const normalizedWatchedName = watchedName.trim();
  const normalizedCurrentEmail = currentEmail.trim().toLowerCase();
  const normalizedWatchedEmail = watchedEmail.trim().toLowerCase();
  const isNameUnchanged = normalizedWatchedName === normalizedCurrentName;
  const isEmailUnchanged = normalizedWatchedEmail === normalizedCurrentEmail;
  const displayName = normalizedWatchedName || currentName;

  const resetForm = useCallback(() => {
    form.reset({ name: currentName, email: currentEmail });
  }, [currentName, currentEmail, form]);

  useEffect(() => {
    setCurrentName(user.name);
    setCurrentEmail(user.email);
  }, [user.name, user.email]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      resetForm();
    }

    wasOpenRef.current = open;
  }, [open, resetForm]);

  async function handleSubmit(values: ProfileFormValues) {
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();

    const hasNameChanged = name !== normalizedCurrentName;
    const hasEmailChanged = email !== normalizedCurrentEmail;

    if (!hasNameChanged && !hasEmailChanged) {
      return;
    }

    setIsSaving(true);

    try {
      // Save name first if changed
      if (hasNameChanged) {
        const nameResult = await authClient.updateUser({ name });

        if (nameResult?.error) {
          toast.error(nameResult.error.message || errors.failedSaveName);
          return;
        }

        setCurrentName(name);
      }

      // Change email if changed
      if (hasEmailChanged) {
        const emailResult = await authClient.changeEmail({
          newEmail: email,
          callbackURL: '/dashboard/chat',
        });

        if (emailResult?.error) {
          toast.error(emailResult.error.message || errors.failedChangeEmail);
          return;
        }

        toast.success(
          t('messages.emailChangeSuccess', {
            currentEmail,
            newEmail: email,
          }),
          {
            icon: <Mail className="size-4" />,
            duration: 8000,
          },
        );
      } else {
        toast.success(t('messages.profileUpdated'));
      }

      form.reset({ name, email });
      router.refresh();
    } catch {
      toast.error(errors.failedSave);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 [&_[data-slot=dialog-close]]:top-[18px] [&_[data-slot=dialog-close]]:right-6 sm:w-[460px] sm:max-w-[460px] sm:p-7 sm:[&_[data-slot=dialog-close]]:top-[22px] sm:[&_[data-slot=dialog-close]]:right-7">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-3 flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-full">
              <AvatarFallback className="rounded-full bg-brand text-2xl font-medium text-brand-foreground">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-[15px] text-muted-foreground">
                {watchedEmail || currentEmail}
              </p>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-name">{labels.name}</Label>
              <Input
                id="profile-name"
                autoComplete="name"
                {...form.register('name')}
                aria-invalid={!!form.formState.errors.name}
                className={cn(
                  form.formState.errors.name &&
                    'border-destructive focus-visible:ring-destructive/20',
                )}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">{labels.email}</Label>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
                aria-invalid={!!form.formState.errors.email}
                className={cn(
                  form.formState.errors.email &&
                    'border-destructive focus-visible:ring-destructive/20',
                )}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">{labels.warning}</p>
              <Button
                type="submit"
                size="lg"
                variant="brand"
                disabled={
                  isSaving ||
                  (isNameUnchanged && isEmailUnchanged) ||
                  !watchedName?.trim() ||
                  !watchedEmail?.trim()
                }
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                {isSaving ? labels.saving : labels.save}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
