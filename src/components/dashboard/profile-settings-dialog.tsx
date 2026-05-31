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
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name must be at most 80 characters'),
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
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentName, setCurrentName] = useState(user.name);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
    },
  });

  const watchedName = form.watch('name');
  const normalizedCurrentName = currentName.trim();
  const normalizedWatchedName = watchedName.trim();
  const isNameUnchanged = normalizedWatchedName === normalizedCurrentName;
  const displayName = normalizedWatchedName || currentName;

  useEffect(() => {
    setCurrentName(user.name);
  }, [user.name]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset({ name: currentName });
    }

    wasOpenRef.current = open;
  }, [currentName, form, open]);

  async function handleSubmit(values: ProfileFormValues) {
    const name = values.name.trim();

    if (name === normalizedCurrentName) {
      return;
    }

    setIsSavingName(true);

    try {
      const result = await authClient.updateUser({ name });

      if (result?.error) {
        toast.error(result.error.message || 'Failed to save name');
        return;
      }

      toast.success('Name updated successfully');
      setCurrentName(name);
      form.reset({ name });
      router.refresh();
    } catch {
      toast.error('Failed to save name');
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 [&_[data-slot=dialog-close]]:top-[18px] [&_[data-slot=dialog-close]]:right-6 sm:w-[460px] sm:max-w-[460px] sm:p-7 sm:[&_[data-slot=dialog-close]]:top-[22px] sm:[&_[data-slot=dialog-close]]:right-7">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update the account name displayed on the dashboard.
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
                {user.email}
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
                value={user.email}
                readOnly
                className="bg-muted/45 text-muted-foreground"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                variant="brand"
                disabled={isSavingName || isNameUnchanged}
              >
                {isSavingName ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                Save name
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
