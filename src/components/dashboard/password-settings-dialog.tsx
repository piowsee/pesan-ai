'use client';

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
import { getPathname } from '@/i18n/navigation';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { type UseFormRegisterReturn, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(1, 'New password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;
type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

type PasswordSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
};

export function PasswordSettingsDialog({
  open,
  onOpenChange,
  user,
}: PasswordSettingsDialogProps) {
  const wasOpenRef = useRef(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<PasswordField, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const resetPasswordHref = useMemo(
    () =>
      getPathname({
        href: '/reset-password',
        locale: 'id',
      }),
    [],
  );

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset();
      setVisiblePasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    }

    wasOpenRef.current = open;
  }, [form, open]);

  async function handleSubmit(values: PasswordFormValues) {
    setIsChangingPassword(true);

    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result?.error) {
        toast.error(result.error.message || 'Failed to change password');
        return;
      }

      toast.success('Password changed successfully');
      form.reset();
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRequestPasswordReset() {
    setIsRequestingReset(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: user.email,
        redirectTo: resetPasswordHref,
      });

      if (result?.error) {
        toast.error(result.error.message || 'Failed to send reset link');
        return;
      }

      toast.success('Password reset link sent to email');
    } catch {
      toast.error('Failed to send reset link');
    } finally {
      setIsRequestingReset(false);
    }
  }

  function togglePasswordVisibility(field: PasswordField) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 [&_[data-slot=dialog-close]]:top-[18px] [&_[data-slot=dialog-close]]:right-6 sm:w-[500px] sm:max-w-[500px] sm:p-7 sm:[&_[data-slot=dialog-close]]:top-[22px] sm:[&_[data-slot=dialog-close]]:right-7">
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>
            Change your login password or send a reset link to your account
            email.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <KeyRound className="size-10 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Password security
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use your old password to change your password. If you forgot it,
                send a reset link to {user.email}.
              </p>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-5"
          >
            <PasswordInput
              id="current-password"
              label="Current password"
              autoComplete="current-password"
              visible={visiblePasswords.currentPassword}
              error={form.formState.errors.currentPassword?.message}
              registration={form.register('currentPassword')}
              onToggle={() => togglePasswordVisibility('currentPassword')}
              labelAction={
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRequestPasswordReset}
                  disabled={isRequestingReset}
                  className="h-auto px-0 py-0 text-sm font-medium text-brand hover:bg-transparent hover:text-brand/80"
                >
                  {isRequestingReset ? (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : null}
                  Forgot password?
                </Button>
              }
            />

            <PasswordInput
              id="new-password"
              label="New password"
              autoComplete="new-password"
              visible={visiblePasswords.newPassword}
              error={form.formState.errors.newPassword?.message}
              registration={form.register('newPassword')}
              onToggle={() => togglePasswordVisibility('newPassword')}
            />

            <PasswordInput
              id="confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
              visible={visiblePasswords.confirmPassword}
              error={form.formState.errors.confirmPassword?.message}
              registration={form.register('confirmPassword')}
              onToggle={() => togglePasswordVisibility('confirmPassword')}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="brand"
                size="lg"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <KeyRound data-icon="inline-start" />
                )}
                Change password
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  autoComplete: string;
  visible: boolean;
  error?: string;
  labelAction?: ReactNode;
  registration: UseFormRegisterReturn<PasswordField>;
  onToggle: () => void;
};

function PasswordInput({
  id,
  label,
  autoComplete,
  visible,
  error,
  labelAction,
  registration,
  onToggle,
}: PasswordInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...registration}
          aria-invalid={!!error}
          className={cn(
            'pr-10',
            error && 'border-destructive focus-visible:ring-destructive/20',
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 h-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
