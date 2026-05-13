export const loginCardCopy = {
  id: {
    title: 'Masuk ke Akun Anda',
    subtitle: 'Masukkan email dan kata sandi Anda.',
  },
  en: {
    title: 'Login to Your Account',
    subtitle: 'Enter your email and password.',
  },
} as const;

export const forgotPasswordCardCopy = {
  id: {
    title: 'Lupa Kata Sandi',
    subtitle: 'Masukkan email Anda untuk menerima tautan reset kata sandi.',
  },
  en: {
    title: 'Forgot Password',
    subtitle: 'Enter your email to receive a password reset link.',
  },
} as const;

export const resetPasswordCardCopy = {
  id: {
    title: 'Atur Ulang Kata Sandi',
    subtitle: 'Masukkan kata sandi baru untuk akun Anda.',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Enter a new password for your account.',
  },
} as const;

export const authBrandPanelCopy = {
  id: {
    headline:
      'Tingkatkan efisiensi bisnis melalui otomatisasi chat WhatsApp dengan dukungan AI.',
  },
  en: {
    headline:
      'Boost your business efficiency through WhatsApp chat automation with AI support.',
  },
} as const;

export const forgotPasswordFormCopy = {
  id: {
    labels: {
      submit: 'Kirim Tautan Reset',
      submitting: 'Mengirim...',
      backToLogin: 'Kembali ke login',
      successTitle: 'Cek email Anda',
      successMessage:
        'Jika email terdaftar, kami telah mengirim tautan untuk mengatur ulang kata sandi Anda.',
    },
    errors: {
      invalidEmail: 'Format email tidak valid',
      unknownError:
        'Terjadi kesalahan saat meminta reset kata sandi. Silakan coba lagi.',
    },
  },
  en: {
    labels: {
      submit: 'Send Reset Link',
      submitting: 'Sending...',
      backToLogin: 'Back to login',
      successTitle: 'Check your email',
      successMessage:
        'If the email exists, we have sent a link to reset your password.',
    },
    errors: {
      invalidEmail: 'Invalid email format',
      unknownError:
        'An error occurred while requesting a password reset. Please try again.',
    },
  },
} as const;

export const loginFormCopy = {
  id: {
    labels: {
      password: 'Kata Sandi',
      forgotPassword: 'Lupa kata sandi?',
      agreePrefix: 'Saya menyetujui',
      terms: 'Syarat Layanan',
      and: 'dan',
      privacy: 'Kebijakan Privasi',
      submit: 'Masuk',
      submitting: 'Memproses...',
      passwordPlaceholder: 'Masukkan kata sandi Anda',
      hidePassword: 'Sembunyikan kata sandi',
      showPassword: 'Tampilkan kata sandi',
    },
    errors: {
      invalidEmail: 'Format email tidak valid',
      passwordRequired: 'Kata sandi wajib diisi',
      passwordLength: 'Kata sandi minimal 8 karakter',
      termsRequired: 'Anda harus menyetujui Syarat dan Privasi untuk lanjut',
      invalidCredentials: 'Email atau kata sandi tidak valid.',
      unknownError: 'Terjadi kesalahan saat login. Silakan coba lagi.',
    },
  },
  en: {
    labels: {
      password: 'Password',
      forgotPassword: 'Forgot password?',
      agreePrefix: 'I agree to the',
      terms: 'Terms of Service',
      and: 'and',
      privacy: 'Privacy Policy',
      submit: 'Login',
      submitting: 'Processing...',
      passwordPlaceholder: 'Enter your password',
      hidePassword: 'Hide password',
      showPassword: 'Show password',
    },
    errors: {
      invalidEmail: 'Invalid email format',
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 8 characters',
      termsRequired: 'You need to agree to the Terms and Privacy to continue',
      invalidCredentials: 'Invalid email or password.',
      unknownError: 'An error occurred during login. Please try again.',
    },
  },
} as const;

export const resetPasswordFormCopy = {
  id: {
    labels: {
      password: 'Kata Sandi Baru',
      confirmPassword: 'Konfirmasi Kata Sandi',
      submit: 'Simpan Kata Sandi Baru',
      submitting: 'Menyimpan...',
      passwordPlaceholder: 'Masukkan kata sandi baru Anda',
      confirmPasswordPlaceholder: 'Ulangi kata sandi baru Anda',
      hidePassword: 'Sembunyikan kata sandi',
      showPassword: 'Tampilkan kata sandi',
      backToLogin: 'Kembali ke login',
      successTitle: 'Kata sandi berhasil diperbarui',
      successMessage: 'Anda sekarang dapat login dengan kata sandi baru Anda.',
      invalidTokenTitle: 'Tautan reset tidak valid',
      invalidTokenMessage:
        'Tautan reset ini tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.',
      requestNewLink: 'Minta tautan baru',
    },
    errors: {
      passwordRequired: 'Kata sandi wajib diisi',
      passwordLength: 'Kata sandi minimal 8 karakter',
      confirmPasswordRequired: 'Konfirmasi kata sandi wajib diisi',
      passwordMismatch: 'Konfirmasi kata sandi tidak cocok',
      invalidToken:
        'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.',
      unknownError:
        'Terjadi kesalahan saat mengatur ulang kata sandi. Silakan coba lagi.',
    },
  },
  en: {
    labels: {
      password: 'New Password',
      confirmPassword: 'Confirm Password',
      submit: 'Save New Password',
      submitting: 'Saving...',
      passwordPlaceholder: 'Enter your new password',
      confirmPasswordPlaceholder: 'Re-enter your new password',
      hidePassword: 'Hide password',
      showPassword: 'Show password',
      backToLogin: 'Back to login',
      successTitle: 'Password updated successfully',
      successMessage: 'You can now sign in with your new password.',
      invalidTokenTitle: 'Invalid reset link',
      invalidTokenMessage:
        'This reset link is invalid or has expired. Please request a new one.',
      requestNewLink: 'Request a new link',
    },
    errors: {
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 8 characters',
      confirmPasswordRequired: 'Password confirmation is required',
      passwordMismatch: 'Password confirmation does not match',
      invalidToken:
        'This reset link is invalid or has expired. Please request a new one.',
      unknownError:
        'An error occurred while resetting your password. Please try again.',
    },
  },
} as const;

export type ForgotPasswordFormCopy =
  (typeof forgotPasswordFormCopy)[keyof typeof forgotPasswordFormCopy];
export type LoginFormCopy = (typeof loginFormCopy)[keyof typeof loginFormCopy];
export type ResetPasswordFormCopy =
  (typeof resetPasswordFormCopy)[keyof typeof resetPasswordFormCopy];
