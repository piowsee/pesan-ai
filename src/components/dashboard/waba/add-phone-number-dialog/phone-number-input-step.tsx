'use client';

import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  useCreatePhoneNumber,
  useRequestVerificationCode,
} from '@/hooks/use-waba-phone-number';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input';
import { toast } from 'sonner';
import { z } from 'zod';

const addPhoneNumberSchema = z.object({
  fullPhoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidPhoneNumber, { message: 'Invalid phone number format' }),
  name: z.string().min(1, 'Display name is required'),
});

type AddPhoneNumberFormValues = z.infer<typeof addPhoneNumberSchema>;

interface PhoneNumberInputStepProps {
  wabaId: string;
  businessName: string | null;
  onSuccess: (phoneNumberId: string) => void;
  onCancel: () => void;
}

export function PhoneNumberInputStep({
  wabaId,
  businessName,
  onSuccess,
  onCancel,
}: PhoneNumberInputStepProps) {
  const createMutation = useCreatePhoneNumber();
  const requestMutation = useRequestVerificationCode();

  const form = useForm<AddPhoneNumberFormValues>({
    resolver: zodResolver(addPhoneNumberSchema),
    defaultValues: {
      fullPhoneNumber: '',
      name: businessName || '',
    },
  });

  async function onPhoneSubmit(values: AddPhoneNumberFormValues) {
    try {
      const parsed = parsePhoneNumber(values.fullPhoneNumber)!;

      // Step 1: Create Phone Number
      const createResponse = await createMutation.mutateAsync({
        wabaId,
        phoneNumber: parsed.nationalNumber,
        name: values.name,
        countryCode: parsed.countryCallingCode,
      });

      const newPhoneNumberId = createResponse.phoneNumberId;

      // Step 2: Request Verification Code (auto-triggered)
      await requestMutation.mutateAsync({
        phoneNumberId: newPhoneNumberId,
        wabaId,
        codeMethod: 'SMS',
        language: 'en_US',
      });

      // Notify parent of success
      onSuccess(newPhoneNumberId);
      toast.success('Verification code sent via SMS');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    }
  }

  const isSubmitting = createMutation.isPending || requestMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Phone Number</DialogTitle>
        <DialogDescription>
          Enter a new phone number for{' '}
          <span className="font-medium text-foreground">
            {businessName || 'this WhatsApp Business Account'}
          </span>
          .
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={form.handleSubmit(onPhoneSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`phone-input-${wabaId}`}>Phone Number</Label>
          <Controller
            name="fullPhoneNumber"
            control={form.control}
            render={({ field }) => (
              <PhoneInput
                id={`phone-input-${wabaId}`}
                placeholder="Enter phone number"
                defaultCountry="ID"
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
          {form.formState.errors.fullPhoneNumber ? (
            <p className="text-xs font-medium text-destructive">
              {form.formState.errors.fullPhoneNumber.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`display-name-${wabaId}`}>Display Name</Label>
          <Input
            id={`display-name-${wabaId}`}
            placeholder="Marketing Department"
            {...form.register('name')}
            disabled={isSubmitting}
          />
          <p className="text-[10px] text-muted-foreground">
            The name that users will see on WhatsApp until they add you to their
            contacts.
          </p>
          {form.formState.errors.name ? (
            <p className="text-xs font-medium text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Requesting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
