import { WabaEmbeddedSignupCard } from '@/components/dashboard/waba/waba-embedded-signup-card';
import { Badge } from '@/components/ui/badge';

export default function WabaPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-6 pb-24 sm:px-6 md:pb-6">
      <section className="flex flex-col gap-3">
        <Badge variant="outline" className="w-fit">
          WABA Setup
        </Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Connect your WhatsApp Business Account
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Start your WABA onboarding from one place. This page now loads the
            Facebook Embedded Signup entry point and captures the identifiers
            returned by the signup flow.
          </p>
        </div>
      </section>

      <WabaEmbeddedSignupCard />
    </div>
  );
}
