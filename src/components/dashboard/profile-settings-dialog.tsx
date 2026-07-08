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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name must be at most 80 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email must be at most 255 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

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
  const wasOpenRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentName, setCurrentName] = useState(user.name);
  const [currentEmail, setCurrentEmail] = useState(user.email);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
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
          toast.error(nameResult.error.message || 'Failed to save name');
          return;
        }

        setCurrentName(name);
      }

      // Change email if changed
      if (hasEmailChanged) {
        const emailResult = await authClient.changeEmail({
          newEmail: email,
          callbackURL: '/dashboard',
        });

        if (emailResult?.error) {
          toast.error(emailResult.error.message || 'Failed to change email');
          return;
        }

        toast.success(
          `Check your inboxes, confirm the change from ${currentEmail}. Then verify with the link sent to ${email}.`,
          {
            icon: <Mail className="size-4" />,
            duration: 8000,
          },
        );
      } else {
        toast.success('Profile updated successfully');
      }

      form.reset({ name, email });
      router.refresh();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 [&_[data-slot=dialog-close]]:top-[18px] [&_[data-slot=dialog-close]]:right-6 sm:w-[460px] sm:max-w-[460px] sm:p-7 sm:[&_[data-slot=dialog-close]]:top-[22px] sm:[&_[data-slot=dialog-close]]:right-7">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your account name and email address.
          </DialogDescription>
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
              <Label htmlFor="profile-name">Name</Label>
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
              <Label htmlFor="profile-email">Email</Label>
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
              <p className="text-xs text-muted-foreground">
                Changing your email will send confirmation links to both your
                current and new email addresses.
              </p>
              <Button
                type="submit"
                size="lg"
                variant="brand"
                disabled={isSaving || (isNameUnchanged && isEmailUnchanged)}
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                Save
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
