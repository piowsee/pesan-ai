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

export const loginFormCopy = {
  id: {
    labels: {
      password: 'Kata Sandi',
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

export type LoginFormCopy = (typeof loginFormCopy)[keyof typeof loginFormCopy];
