'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUser } from '@/hooks/use-users';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// ─── Component ───────────────────────────────────────────────────────

export function CreateUserDialog() {
  const t = useTranslations('Admin.CreateUserDialog');
  const [isOpen, setIsOpen] = useState(false);
  const createUser = useCreateUser();

  const createUserSchema = z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    email: z.string().email(t('validation.invalidEmail')),
    role: z.enum(['user', 'admin'], {
      message: t('validation.roleRequired'),
    }),
  });

  type CreateUserFormValues = z.infer<typeof createUserSchema>;

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
    },
  });

  async function onSubmit(values: CreateUserFormValues) {
    createUser.mutate(values, {
      onSuccess: (result) => {
        toast.success(result.message ?? t('messages.success'));
        form.reset();
        setIsOpen(false);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : t('messages.errorFallback');
        toast.error(message);
      },
    });
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      form.reset();
      createUser.reset();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus data-icon="inline-start" />
          {t('trigger')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Name Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t('labels.name')}</Label>
            <Input
              id="name"
              placeholder={t('placeholders.name')}
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t('labels.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('placeholders.email')}
              {...form.register('email')}
              aria-invalid={!!form.formState.errors.email}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Role Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">{t('labels.role')}</Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder={t('placeholders.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('roles.user')}</SelectItem>
                    <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.role && (
              <p className="text-sm text-destructive">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          {/* Server Error */}
          {createUser.isError && (
            <p className="text-sm text-destructive">
              {createUser.error instanceof Error
                ? createUser.error.message
                : t('messages.errorFallback')}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending
                ? t('actions.creating')
                : t('actions.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
