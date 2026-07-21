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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUser } from '@/hooks/use-users';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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

  const name = form.watch('name');
  const email = form.watch('email');
  const role = form.watch('role');
  const isFormFilled = !!name?.trim() && !!email?.trim() && !!role;

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
        <Button variant="brand" size="lg">
          <UserPlus data-icon="inline-start" />
          {t('trigger')}
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden rounded-lg border border-brand/20 p-0 text-brand shadow-xl sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <UserPlus className="mt-0.5 size-7 shrink-0 text-brand" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-brand">
                {t('title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-brand">
                {t('description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5">
          <div className="h-px bg-brand/20" />
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-5 py-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-brand">
              {t('labels.name')}
            </Label>
            <Input
              id="name"
              placeholder={t('placeholders.name')}
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
              className={cn(
                form.formState.errors.name &&
                  'border-destructive focus-visible:ring-destructive/20',
              )}
            />
            {form.formState.errors.name && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-brand">
              {t('labels.email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t('placeholders.email')}
              {...form.register('email')}
              aria-invalid={!!form.formState.errors.email}
              className={cn(
                form.formState.errors.email &&
                  'border-destructive focus-visible:ring-destructive/20',
              )}
            />
            {form.formState.errors.email && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role" className="text-brand">
              {t('labels.role')}
            </Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role" size="lg" className="w-full">
                    <SelectValue placeholder={t('placeholders.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="user">{t('roles.user')}</SelectItem>
                      <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.role && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          {createUser.isError && (
            <p className="text-xs font-medium text-destructive">
              {createUser.error instanceof Error
                ? createUser.error.message
                : t('messages.errorFallback')}
            </p>
          )}

          <DialogFooter className="mx-0 mb-0 mt-2 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-brand hover:bg-primary/5 hover:text-brand"
              onClick={() => handleOpenChange(false)}
              disabled={createUser.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={createUser.isPending || !isFormFilled}
            >
              {createUser.isPending ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  {t('actions.creating')}
                </>
              ) : (
                t('actions.submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
