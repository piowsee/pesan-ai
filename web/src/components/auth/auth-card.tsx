import { type ReactNode, Suspense } from 'react';

type Props = {
  title: string;
  subtitle: string;
  formKey: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, formKey, children }: Props) {
  return (
    <div className="relative z-10 w-full max-w-md xl:max-w-xl">
      <div className="mb-8 space-y-2.5">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-foreground sm:text-[34px] text-center">
          {title}
        </h1>
        <p className="text-center text-sm leading-6 text-muted-foreground mb-10">
          {subtitle}
        </p>
      </div>
      <Suspense
        key={formKey}
        fallback={
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
