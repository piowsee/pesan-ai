'use client';

import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPSlot } from '@/components/ui/input-otp';
import { useCountdown } from '@/hooks/use-countdown';
import {
  useRequestVerificationCode,
  useVerifyAndRegisterPhoneNumber,
} from '@/hooks/use-waba-phone-number';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PhoneNumberOtpStepProps {
  wabaId: string;
  phoneNumberId: string;
  onSuccess: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function PhoneNumberOtpStep({
  wabaId,
  phoneNumberId,
  onSuccess,
  onBack,
  onCancel,
}: PhoneNumberOtpStepProps) {
  const [otpValue, setOtpValue] = useState('');

  const [count, { startCountdown, resetCountdown }] = useCountdown({
    countStart: 60,
  });

  const requestMutation = useRequestVerificationCode();
  const verifyMutation = useVerifyAndRegisterPhoneNumber();

  // Start countdown on mount
  useEffect(() => {
    startCountdown();
  }, [startCountdown]);

  async function onResendCode() {
    try {
      await requestMutation.mutateAsync({
        phoneNumberId,
        wabaId,
        codeMethod: 'SMS',
      });
      toast.success('Verification code resent');
      resetCountdown();
      startCountdown();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to resend code';
      toast.error(message);
    }
  }

  async function onOtpConfirm() {
    if (!phoneNumberId || otpValue.length !== 6) return;

    try {
      // Step 3: Verify Code
      await verifyMutation.mutateAsync({
        phoneNumberId,
        wabaId,
        code: otpValue,
      });

      // Step 4: Success
      toast.success('Phone number verified and registered successfully');
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Verification failed';
      toast.error(message);
    }
  }

  const isVerifying = verifyMutation.isPending;
  const canResend = count === 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enter Verification Code</DialogTitle>
        <DialogDescription>
          We have sent a 6-digit verification code to your phone number via SMS.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-8 py-6">
        <InputOTP
          maxLength={6}
          value={otpValue}
          onChange={setOtpValue}
          disabled={isVerifying}
          containerClassName="w-full"
        >
          <div className="flex w-full items-center justify-center gap-2 sm:gap-4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-12 rounded-xl border border-input text-xl shadow-sm sm:size-14 sm:text-2xl"
              />
            ))}
          </div>
        </InputOTP>

        <div className="flex w-full justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isVerifying}
            className="text-xs"
          >
            Change phone number
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResendCode}
            disabled={isVerifying || requestMutation.isPending || !canResend}
            className="text-xs"
          >
            {canResend ? 'Resend code' : `Resend code in ${count}s`}
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isVerifying}
        >
          Cancel
        </Button>
        <Button
          onClick={onOtpConfirm}
          disabled={otpValue.length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
