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
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const addPhoneNumberSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

type AddPhoneNumberFormValues = z.infer<typeof addPhoneNumberSchema>;

type AddPhoneNumberDialogProps = {
  businessName: string | null;
  wabaId: string;
};

export function AddPhoneNumberDialog({
  businessName,
  wabaId,
}: AddPhoneNumberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AddPhoneNumberFormValues>({
    resolver: zodResolver(addPhoneNumberSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      form.reset();
    }
  }

  function onSubmit(values: AddPhoneNumberFormValues) {
    toast.message(
      `TODO: submit new phone number ${values.phoneNumber} for WABA ${wabaId}`,
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Add Phone Number
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Phone Number</DialogTitle>
          <DialogDescription>
            Enter a new phone number for{' '}
            {businessName || 'this WhatsApp Business Account'}.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`phone-number-${wabaId}`}>Phone Number</Label>
            <Input
              id={`phone-number-${wabaId}`}
              placeholder="+62 812 3456 7890"
              {...form.register('phoneNumber')}
              aria-invalid={!!form.formState.errors.phoneNumber}
            />
            {form.formState.errors.phoneNumber ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.phoneNumber.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
