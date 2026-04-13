'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';

// TODO: Add detailed documentation for the POST request body schema and response body format

export function WebhookDocsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen data-icon="inline-start" />
          API Docs
        </Button>
      </DialogTrigger>

      <DialogContent className="p-0 sm:max-w-2xl">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Webhook API Documentation</DialogTitle>
          <DialogDescription>
            How your webhook endpoint should handle incoming requests from
            pesan-ai.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-8 p-6 text-sm min-w-0">
            {/* Auth Section */}
            <div className="flex flex-col gap-3 min-w-0">
              <h3 className="font-semibold text-foreground">Authentication</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every request includes a JWT bearer token in the{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono whitespace-nowrap">
                  Authorization
                </code>{' '}
                header, signed with your <strong>passphrase</strong> using the{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  HS256
                </code>{' '}
                algorithm. Verify this token on your server to authenticate
                requests.
              </p>
              <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre sm:whitespace-pre-wrap">
                {`Authorization: Bearer <jwt-token>`}
              </pre>
            </div>

            {/* GET Request */}
            <div className="flex flex-col gap-3 border-t pt-8 min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  GET
                </span>
                <h3 className="font-semibold text-foreground">
                  Validation Request
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When you register a webhook, pesan-ai sends a{' '}
                <strong>GET</strong> request to your URL to verify it is
                reachable and can authenticate. Your endpoint must validate the
                JWT token and return a{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono whitespace-nowrap">
                  200 OK
                </code>{' '}
                response to confirm the webhook is valid.
              </p>
              <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre sm:whitespace-pre-wrap">
                {`GET <your-webhook-url>
Headers:
  Authorization: Bearer <jwt-token>

Expected Response: 200 OK`}
              </pre>
            </div>

            {/* POST Request */}
            <div className="flex flex-col gap-3 border-t pt-8 min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  POST
                </span>
                <h3 className="font-semibold text-foreground">
                  Message Request
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When a new message is received, pesan-ai forwards it to your
                webhook via a <strong>POST</strong> request. Your endpoint
                should validate the JWT token, process the message, and return a
                response.
              </p>
              {/* TODO: Document the exact POST request body schema (fields, types, example payload) */}
              {/* TODO: Document the expected response body format and status codes */}
              <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre sm:whitespace-pre-wrap">
                {`POST <your-webhook-url>
Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: application/json

Body: { ... }

Expected Response: 200 OK with JSON body`}
              </pre>
              <p className="text-xs italic text-muted-foreground/70">
                Request and response body documentation coming soon.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
