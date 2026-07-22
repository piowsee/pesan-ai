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
} from '@/hooks/use-phone-number';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
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
  const t = useTranslations('Waba.addNumber.otp');

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
      toast.success(t('resendSuccess'));
      resetCountdown();
      startCountdown();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('resendError');
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
      toast.success(t('verifySuccess'));
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('verifyError');
      toast.error(message);
    }
  }

  const isVerifying = verifyMutation.isPending;
  const canResend = count === 0;

  function handleOtpChange(value: string) {
    setOtpValue(value.replace(/\D/g, '').slice(0, 6));
  }

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
              {t('description')}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="px-5">
        <div className="h-px bg-brand/20" />
      </div>

      <div className="flex flex-col items-center gap-7 px-5 py-6">
        <InputOTP
          maxLength={6}
          value={otpValue}
          onChange={handleOtpChange}
          disabled={isVerifying}
          containerClassName="w-full"
        >
          <div className="flex w-full items-center justify-center gap-2 sm:gap-4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-11 rounded-lg border border-brand/20 text-xl text-brand shadow-sm sm:size-12 sm:text-2xl"
              />
            ))}
          </div>
        </InputOTP>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isVerifying}
            className="text-brand hover:bg-primary/5 hover:text-brand"
          >
            {t('changeNumber')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResendCode}
            disabled={isVerifying || requestMutation.isPending || !canResend}
            className="text-brand hover:bg-primary/5 hover:text-brand"
          >
            {canResend ? t('resend') : t('resendIn', { count })}
          </Button>
        </div>
      </div>

      <DialogFooter className="mx-5 mb-5 gap-2 border-t border-brand/20 bg-transparent p-0 pt-4">
        <Button
          type="button"
          variant="ghost"
          className="text-brand hover:bg-primary/5 hover:text-brand"
          onClick={onCancel}
          disabled={isVerifying}
        >
          {t('cancel')}
        </Button>
        <Button
          variant="brand"
          onClick={onOtpConfirm}
          disabled={otpValue.length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              {t('verifying')}
            </>
          ) : (
            t('confirm')
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
