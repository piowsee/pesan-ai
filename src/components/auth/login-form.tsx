'use client';

import { LoginButton } from '@/components/auth/login-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type FormErrors = {
  email?: string;
  password?: string;
  terms?: string;
  form?: string;
};

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function validateForm(): boolean {
    const nextErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Invalid email format.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password cannot be empty.';
    } else if (password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (!agreed) {
      nextErrors.terms =
        'You need to agree to the Terms of Service to continue.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    setErrors({});
    return true;
  }

  function handleError(message: string) {
    setErrors({ form: message });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={Boolean(errors.email)}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email || errors.form) {
              setErrors((prev) => ({
                ...prev,
                email: undefined,
                form: undefined,
              }));
            }
          }}
          className={cn(
            'h-10 rounded-md shadow-sm',
            errors.email &&
              'border-destructive focus-visible:ring-destructive/20',
          )}
          placeholder="name@company.com"
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            minLength={8}
            aria-invalid={Boolean(errors.password)}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  password: undefined,
                  form: undefined,
                }));
              }
            }}
            className={cn(
              'h-10 rounded-md pr-10 shadow-sm',
              errors.password &&
                'border-destructive focus-visible:ring-destructive/20',
            )}
            placeholder="Enter your password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-transparent"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked: boolean | 'indeterminate') => {
              setAgreed(checked === true);
              if (errors.terms) {
                setErrors((prev) => ({ ...prev, terms: undefined }));
              }
            }}
            className="mt-1 shrink-0 cursor-pointer"
          />
          <Label
            htmlFor="terms"
            className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground select-none"
          >
            I agree to the{' '}
            <Link
              href="/terms"
              className="font-semibold text-brand underline-offset-4 hover:underline cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="font-semibold text-brand underline-offset-4 hover:underline cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </Link>
            .
          </Label>
        </div>

        {errors.terms ? (
          <p className="text-xs text-destructive">{errors.terms}</p>
        ) : null}
      </div>

      {errors.form ? (
        <p className="text-xs text-destructive">{errors.form}</p>
      ) : null}

      <LoginButton
        email={email}
        password={password}
        onError={handleError}
        onBeforeLogin={validateForm}
      />
    </div>
  );
}
