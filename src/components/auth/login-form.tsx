'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type FormErrors = {
  email?: string;
  password?: string;
  terms?: string;
  form?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, setIsPending] = useState(false);

  function validateForm() {
    const nextErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Format email tidak valid.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password tidak boleh kosong.';
    } else if (password.trim().length < 8) {
      nextErrors.password = 'Password minimal 8 karakter.';
    }

    if (!agreed) {
      nextErrors.terms =
        'Anda perlu menyetujui Terms of Service untuk melanjutkan.';
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsPending(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: '/dashboard',
        rememberMe: true,
      });

      if (result?.error) {
        setErrors({
          form: result.error.message || 'Email atau password tidak valid.',
        });
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrors({
        form: 'Terjadi kendala saat login. Silakan coba lagi.',
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
          placeholder="nama@perusahaan.com"
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
            placeholder="Masukkan password Anda"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-transparent"
            aria-label={
              showPassword ? 'Sembunyikan password' : 'Tampilkan password'
            }
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
              href="/terms-of-service"
              className="font-semibold text-brand underline-offset-4 hover:underline cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy-policy"
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

      <Button
        type="submit"
        variant="brand"
        size="lg"
        disabled={isPending}
        className="mt-2 h-10 w-full rounded-md shadow-sm cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : null}
        {isPending ? 'Memproses...' : 'Login'}
      </Button>
    </form>
  );
}
