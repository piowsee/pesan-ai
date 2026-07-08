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
} from '@/hooks/use-phone-number';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';
import { FaWhatsapp } from 'react-icons/fa6';
import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input';
import { toast } from 'sonner';
import { z } from 'zod';

type PhoneNumberInputValidation = {
  numberRequired: string;
  invalidNumber: string;
  nameRequired: string;
};

const addPhoneNumberSchema = (errors: PhoneNumberInputValidation) =>
  z.object({
    fullPhoneNumber: z
      .string()
      .min(1, errors.numberRequired)
      .refine(isValidPhoneNumber, { message: errors.invalidNumber }),
    name: z.string().min(1, errors.nameRequired),
  });

type AddPhoneNumberFormValues = {
  fullPhoneNumber: string;
  name: string;
};

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
  const t = useTranslations('Waba.addNumber.input');
  const validationErrors = t.raw('validation') as PhoneNumberInputValidation;

  const form = useForm<AddPhoneNumberFormValues>({
    resolver: zodResolver(addPhoneNumberSchema(validationErrors)),
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
      toast.success(t('successToast'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errorToast');
      toast.error(message);
    }
  }

  const isSubmitting = createMutation.isPending || requestMutation.isPending;

  return (
    <>
      <DialogHeader className="px-5 pt-5 pb-4 pr-12">
        <div className="mb-3 flex items-center gap-3">
          <FaWhatsapp className="size-7 shrink-0 text-[#25D366]" />
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold text-brand">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-relaxed text-brand">
              {t('descriptionPrefix')}
              <span className="font-semibold">
                {businessName || t('descriptionFallback')}
              </span>
              .
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="px-5">
        <div className="h-px bg-brand/20" />
      </div>

      <form
        onSubmit={form.handleSubmit(onPhoneSubmit)}
        className="flex flex-col gap-4 px-5 py-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`phone-input-${wabaId}`} className="text-brand">
            {t('labelNumber')}
          </Label>
          <Controller
            name="fullPhoneNumber"
            control={form.control}
            render={({ field }) => (
              <PhoneInput
                id={`phone-input-${wabaId}`}
                placeholder={t('placeholderNumber')}
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
          <Label htmlFor={`display-name-${wabaId}`} className="text-brand">
            {t('labelName')}
          </Label>
          <Input
            id={`display-name-${wabaId}`}
            placeholder={t('placeholderName')}
            {...form.register('name')}
            disabled={isSubmitting}
          />
          <p className="text-xs leading-relaxed text-brand">
            {t('nameHelper')}
          </p>
          {form.formState.errors.name ? (
            <p className="text-xs font-medium text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 mt-2 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="text-brand hover:bg-primary/5 hover:text-brand"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" variant="brand" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                {t('submitting')}
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
