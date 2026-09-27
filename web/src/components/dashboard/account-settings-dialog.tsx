'use client';

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
import { Separator } from '@/components/ui/separator';
import { getPathname, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  LockKeyhole,
  Settings,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { type UseFormRegisterReturn, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export type AccountSettingsTab = 'general' | 'security';

type LanguageCode = (typeof routing.locales)[number];

type LanguageOption = {
  label: string;
  value: LanguageCode;
};

type AccountSettingsLabels = {
  title: string;
  description: string;
  tabs: Record<AccountSettingsTab, string>;
};

type GeneralSettingsLabels = {
  title: string;
  description: string;
  language: string;
  languageDescription: string;
};

type SecuritySettingsLabels = {
  title: string;
  description: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  forgotPassword: string;
  changePassword: string;
  changePasswordDescription: string;
  changingPassword: string;
  hidePassword: string;
  showPassword: string;
};

type SecuritySettingsMessages = {
  passwordChanged: string;
  resetLinkSent: string;
};

type SecuritySettingsErrors = {
  currentPasswordRequired: string;
  newPasswordRequired: string;
  passwordLength: string;
  confirmPasswordRequired: string;
  passwordMismatch: string;
  failedChangePassword: string;
  failedSendReset: string;
};

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;
type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

type AccountSettingsDialogProps = {
  activeTab: AccountSettingsTab;
  onActiveTabChange: (tab: AccountSettingsTab) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
};

function createPasswordSchema(errors: SecuritySettingsErrors) {
  return z
    .object({
      currentPassword: z.string().min(1, errors.currentPasswordRequired),
      newPassword: z
        .string()
        .min(1, errors.newPasswordRequired)
        .min(8, errors.passwordLength),
      confirmPassword: z.string().min(1, errors.confirmPasswordRequired),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ['confirmPassword'],
      message: errors.passwordMismatch,
    });
}

export function AccountSettingsDialog({
  activeTab,
  onActiveTabChange,
  open,
  onOpenChange,
  user,
}: AccountSettingsDialogProps) {
  const locale = useLocale() as LanguageCode;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabButtonRef = useRef<HTMLButtonElement | null>(null);
  const t = useTranslations('AccountSettingsDialog');
  const navbarT = useTranslations('Navbar');

  const labels = t.raw('labels') as AccountSettingsLabels;
  const general = t.raw('general') as GeneralSettingsLabels;
  const security = t.raw('security.labels') as SecuritySettingsLabels;
  const securityErrors = t.raw('security.errors') as SecuritySettingsErrors;
  const securityMessages = t.raw(
    'security.messages',
  ) as SecuritySettingsMessages;
  const languageOptions = navbarT.raw('languages') as LanguageOption[];

  const tabs: Array<{
    value: AccountSettingsTab;
    label: string;
    icon: typeof Settings;
  }> = [
    { value: 'general', label: labels.tabs.general, icon: Settings },
    { value: 'security', label: labels.tabs.security, icon: LockKeyhole },
  ];

  function handleLanguageChange(nextLocale: LanguageCode) {
    if (nextLocale === locale) {
      return;
    }

    const query = searchParams.toString();
    const nextHref = query ? `${pathname}?${query}` : pathname || '/';

    router.replace(nextHref, { locale: nextLocale, scroll: false });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 sm:w-[760px] sm:max-w-[760px] [&_[data-slot=dialog-close]]:top-[18px] [&_[data-slot=dialog-close]]:right-6 sm:[&_[data-slot=dialog-close]]:top-[22px] sm:[&_[data-slot=dialog-close]]:right-7"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          activeTabButtonRef.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="grid h-[min(580px,calc(100dvh-2rem))] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background sm:grid-cols-[240px_minmax(0,1fr)] sm:grid-rows-1">
          <aside className="border-b border-brand/15 bg-background p-6 sm:border-r sm:border-b-0 sm:p-7">
            <div className="pr-10 sm:pr-0">
              <p className="text-base font-semibold text-brand">
                {labels.title}
              </p>
            </div>

            <nav
              aria-label={labels.title}
              className="mt-4 flex gap-0 sm:flex-col"
              role="tablist"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.value;

                return (
                  <Button
                    ref={selected ? activeTabButtonRef : undefined}
                    key={tab.value}
                    type="button"
                    variant="ghost"
                    role="tab"
                    aria-selected={selected}
                    className={cn(
                      'h-10 justify-start rounded-md px-2.5 py-2.5 text-sm font-semibold text-brand hover:bg-primary/5 hover:text-brand focus:bg-primary/5 focus:text-brand aria-selected:bg-primary/5 aria-selected:text-brand',
                      selected && 'bg-primary/5 text-brand',
                    )}
                    onClick={() => onActiveTabChange(tab.value)}
                  >
                    <Icon data-icon="inline-start" />
                    {tab.label}
                  </Button>
                );
              })}
            </nav>
          </aside>

          <section className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-6 py-7 sm:px-8">
            {activeTab === 'general' ? (
              <GeneralSettingsPanel
                activeLocale={locale}
                labels={general}
                languageOptions={languageOptions}
                onLanguageChange={handleLanguageChange}
              />
            ) : (
              <SecuritySettingsPanel
                errors={securityErrors}
                labels={security}
                locale={locale}
                messages={securityMessages}
                user={user}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type GeneralSettingsPanelProps = {
  activeLocale: LanguageCode;
  labels: GeneralSettingsLabels;
  languageOptions: LanguageOption[];
  onLanguageChange: (locale: LanguageCode) => void;
};

function GeneralSettingsPanel({
  activeLocale,
  labels,
  languageOptions,
  onLanguageChange,
}: GeneralSettingsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="hidden sm:block">
        <h2 className="text-xl font-semibold tracking-tight text-brand">
          {labels.title}
        </h2>
      </div>

      <Separator className="hidden bg-brand/15 sm:block" />

      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-md">
          <p className="text-sm font-semibold text-brand">{labels.language}</p>
          <p className="mt-0.5 text-xs leading-5 text-brand/55">
            {labels.languageDescription}
          </p>
        </div>

        <SettingsLanguageDropdown
          locale={activeLocale}
          options={languageOptions}
          onLanguageChange={onLanguageChange}
        />
      </div>
    </div>
  );
}

type SettingsLanguageDropdownProps = {
  locale: LanguageCode;
  options: LanguageOption[];
  onLanguageChange: (locale: LanguageCode) => void;
};

function SettingsLanguageDropdown({
  locale,
  options,
  onLanguageChange,
}: SettingsLanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeLanguage =
    options.find((option) => option.value === locale)?.label ??
    options[0]?.label;

  return (
    <div className="relative shrink-0 self-start" ref={menuRef}>
      <Button
        variant="unstyled"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center gap-1.5 px-2 text-sm font-semibold text-brand/80 transition-colors hover:text-brand"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Globe aria-hidden="true" className="size-4" />
        <span>{activeLanguage}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </Button>

      <div
        role="menu"
        className={cn(
          'absolute top-full left-0 z-60 mt-1 min-w-40 bg-background py-1 shadow-md ring-1 ring-brand/20 transition-all duration-150 sm:right-0 sm:left-auto',
          isOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-1 opacity-0',
        )}
      >
        {options.map((option) => (
          <Button
            variant="unstyled"
            key={option.value}
            type="button"
            role="menuitem"
            className={cn(
              'block w-full px-4 py-2.5 text-left text-sm font-medium transition-colors',
              locale === option.value
                ? 'text-brand'
                : 'text-brand/50 hover:text-brand focus:text-brand',
            )}
            onClick={() => {
              setIsOpen(false);
              onLanguageChange(option.value);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

type SecuritySettingsPanelProps = {
  errors: SecuritySettingsErrors;
  labels: SecuritySettingsLabels;
  locale: LanguageCode;
  messages: SecuritySettingsMessages;
  user: User;
};

function SecuritySettingsPanel({
  errors,
  labels,
  locale,
  messages,
  user,
}: SecuritySettingsPanelProps) {
  const wasMountedRef = useRef(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<PasswordField, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const passwordSchema = useMemo(() => createPasswordSchema(errors), [errors]);
  const resetPasswordHref = useMemo(
    () =>
      getPathname({
        href: '/reset-password',
        locale,
      }),
    [locale],
  );

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const currentPassword = form.watch('currentPassword');
  const newPassword = form.watch('newPassword');
  const confirmPassword = form.watch('confirmPassword');
  const isFormFilled =
    !!currentPassword?.trim() &&
    !!newPassword?.trim() &&
    !!confirmPassword?.trim();

  useEffect(() => {
    if (!wasMountedRef.current) {
      wasMountedRef.current = true;
      return;
    }

    form.clearErrors();
  }, [form, passwordSchema]);

  async function handleSubmit(values: PasswordFormValues) {
    setIsChangingPassword(true);

    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result?.error) {
        toast.error(result.error.message || errors.failedChangePassword);
        return;
      }

      toast.success(messages.passwordChanged);
      form.reset();
      setVisiblePasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch {
      toast.error(errors.failedChangePassword);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRequestPasswordReset() {
    setIsRequestingReset(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: user.email,
        redirectTo: resetPasswordHref,
      });

      if (result?.error) {
        toast.error(result.error.message || errors.failedSendReset);
        return;
      }

      toast.success(messages.resetLinkSent);
    } catch {
      toast.error(errors.failedSendReset);
    } finally {
      setIsRequestingReset(false);
    }
  }

  function togglePasswordVisibility(field: PasswordField) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden sm:block">
        <h2 className="text-xl font-semibold tracking-tight text-brand">
          {labels.title}
        </h2>
      </div>

      <Separator className="hidden bg-brand/15 sm:block" />

      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-md">
          <p className="text-sm font-semibold text-brand">
            {labels.changePassword}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-brand/55">
            {labels.changePasswordDescription}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={handleRequestPasswordReset}
          disabled={isRequestingReset}
          className="h-auto shrink-0 self-start px-0 py-0 text-sm font-medium text-brand hover:bg-transparent hover:text-brand/80 sm:self-auto"
        >
          {isRequestingReset ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : null}
          {labels.forgotPassword}
        </Button>
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-5"
      >
        <PasswordInput
          id="current-password"
          label={labels.currentPassword}
          autoComplete="current-password"
          visible={visiblePasswords.currentPassword}
          error={form.formState.errors.currentPassword?.message}
          registration={form.register('currentPassword')}
          onToggle={() => togglePasswordVisibility('currentPassword')}
          showPasswordLabel={labels.showPassword}
          hidePasswordLabel={labels.hidePassword}
        />

        <PasswordInput
          id="new-password"
          label={labels.newPassword}
          autoComplete="new-password"
          visible={visiblePasswords.newPassword}
          error={form.formState.errors.newPassword?.message}
          registration={form.register('newPassword')}
          onToggle={() => togglePasswordVisibility('newPassword')}
          showPasswordLabel={labels.showPassword}
          hidePasswordLabel={labels.hidePassword}
        />

        <PasswordInput
          id="confirm-password"
          label={labels.confirmPassword}
          autoComplete="new-password"
          visible={visiblePasswords.confirmPassword}
          error={form.formState.errors.confirmPassword?.message}
          registration={form.register('confirmPassword')}
          onToggle={() => togglePasswordVisibility('confirmPassword')}
          showPasswordLabel={labels.showPassword}
          hidePasswordLabel={labels.hidePassword}
        />

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full sm:w-auto"
            disabled={isChangingPassword || !isFormFilled}
          >
            {isChangingPassword ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {isChangingPassword
              ? labels.changingPassword
              : labels.changePassword}
          </Button>
        </div>
      </form>
    </div>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  autoComplete: string;
  visible: boolean;
  error?: string;
  labelAction?: ReactNode;
  registration: UseFormRegisterReturn<PasswordField>;
  onToggle: () => void;
  showPasswordLabel: string;
  hidePasswordLabel: string;
};

function PasswordInput({
  id,
  label,
  autoComplete,
  visible,
  error,
  labelAction,
  registration,
  onToggle,
  showPasswordLabel,
  hidePasswordLabel,
}: PasswordInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-brand">
          {label}
        </Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...registration}
          aria-invalid={!!error}
          className={cn(
            'pr-10',
            error && 'border-destructive focus-visible:ring-destructive/20',
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 h-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
          aria-label={visible ? hidePasswordLabel : showPasswordLabel}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
