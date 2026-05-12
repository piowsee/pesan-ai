'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PhoneNumberInputStep } from './phone-number-input-step';
import { PhoneNumberOtpStep } from './phone-number-otp-step';

type Step = 'input' | 'otp';

type AddPhoneNumberDialogProps = {
  businessName: string | null;
  wabaId: string;
};

export function AddPhoneNumberDialog({
  businessName,
  wabaId,
}: AddPhoneNumberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Add Phone Number
        </Button>
      </DialogTrigger>

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
