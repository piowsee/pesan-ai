import { LoginForm } from '@/components/auth/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function LoginCard() {
  return (
    <Card className="relative z-10 w-full max-w-md xl:max-w-xl border-border/50 bg-background/50 shadow-lg backdrop-blur-sm sm:p-4">
      <CardHeader className="space-y-4 text-center">
        <CardTitle className="text-[32px] leading-tight font-bold tracking-tight text-foreground sm:text-[34px]">
          Login Akun Anda
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-muted-foreground pb-4">
          Masukkan email dan password anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
