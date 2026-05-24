'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { PhoneNumberInputStep } from './phone-number-input-step';
import { PhoneNumberOtpStep } from './phone-number-otp-step';

type Step = 'input' | 'otp';

type AddPhoneNumberDialogProps = {
  businessName: string | null;
  wabaId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
};

export function AddPhoneNumberDialog({
  businessName,
  wabaId,
  open,
  onOpenChange,
  trigger,
}: AddPhoneNumberDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);

  const isOpen = open ?? internalOpen;
  const isControlled = open !== undefined;

  function handleOpenChange(open: boolean) {
    if (!isControlled) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);

    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setStep('input');
        setPhoneNumberId(null);
      }, 300);
    }
  }

  function handleInputSuccess(id: string) {
    setPhoneNumberId(id);
    setStep('otp');
  }

  function handleOtpSuccess() {
    handleOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger !== null ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-brand text-brand hover:bg-brand/90 hover:text-brand-foreground sm:w-auto"
            >
              <Plus data-icon="inline-start" />
              Tambah nomor
            </Button>
          )}
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md">
        {step === 'input' ? (
          <PhoneNumberInputStep
            wabaId={wabaId}
            businessName={businessName}
            onSuccess={handleInputSuccess}
            onCancel={() => handleOpenChange(false)}
          />
        ) : (
          <PhoneNumberOtpStep
            wabaId={wabaId}
            phoneNumberId={phoneNumberId!}
            onSuccess={handleOtpSuccess}
            onBack={() => setStep('input')}
            onCancel={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
