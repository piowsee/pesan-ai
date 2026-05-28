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
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(1, 'Password baru wajib diisi')
      .min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi password tidak sama',
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
        toast.error(result.error.message || 'Gagal mengubah password');
        return;
      }

      toast.success('Password berhasil diubah');
      form.reset();
    } catch {
      toast.error('Gagal mengubah password');
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
        toast.error(result.error.message || 'Gagal mengirim link reset');
        return;
      }

      toast.success('Link reset password sudah dikirim ke email');
    } catch {
      toast.error('Gagal mengirim link reset');
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
          <DialogTitle>Settings akun</DialogTitle>
          <DialogDescription>
            Ubah password login atau kirim link reset ke email akun.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <KeyRound className="size-10 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Keamanan password
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Gunakan password lama untuk mengganti password. Kalau lupa,
                kirim link reset ke {user.email}.
              </p>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-5"
          >
            <PasswordInput
              id="current-password"
              label="Password saat ini"
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
                  Lupa password?
                </Button>
              }
            />

            <PasswordInput
              id="new-password"
              label="Password baru"
              autoComplete="new-password"
              visible={visiblePasswords.newPassword}
              error={form.formState.errors.newPassword?.message}
              registration={form.register('newPassword')}
              onToggle={() => togglePasswordVisibility('newPassword')}
            />

            <PasswordInput
              id="confirm-password"
              label="Konfirmasi password baru"
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
                Ubah password
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
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
