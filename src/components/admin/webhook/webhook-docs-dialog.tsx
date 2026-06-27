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
                Every request includes a bearer token in the{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono whitespace-nowrap">
                  Authorization
                </code>{' '}
                header. Validation requests use a short-lived JWT signed with
                your <strong>passphrase</strong>. Message requests use the same
                JWT-based authentication.
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
                should verify the JWT bearer token using your configured
                passphrase, process the message history, and return a bot
                response.
              </p>
              <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre sm:whitespace-pre-wrap">
                {`POST <your-webhook-url>
Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: application/json

Request Body:
{
  "messages": [
    {
      "sequence": 1,
      "source": "customer",
      "timestamp": "2026-06-24T10:00:00.000Z",
      "content": "Hi, I need help with my booking."
    },
    {
      "sequence": 2,
      "source": "bot",
      "timestamp": "2026-06-24T10:00:05.000Z",
      "content": "Sure, what would you like to change?"
    }
  ]
}`}
              </pre>
              <div className="flex flex-col gap-2 text-muted-foreground">
                <p className="leading-relaxed">
                  The{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                    messages
                  </code>{' '}
                  array contains text messages in chronological order.
                </p>
                <ul className="list-disc pl-5 leading-relaxed">
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      sequence
                    </code>
                    : number, chronological order starting at 1.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      source
                    </code>
                    : one of{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      customer
                    </code>
                    ,{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      admin
                    </code>
                    , or{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      bot
                    </code>
                    .
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      timestamp
                    </code>
                    : ISO-8601 timestamp string.
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      content
                    </code>
                    : text message content.
                  </li>
                </ul>
              </div>
              <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre sm:whitespace-pre-wrap">
                {`Expected Response: 200 OK
Content-Type: application/json

{
  "botResponse": "Thanks. I found your booking and can help update it.",
  "adminTakeover": false
}`}
              </pre>
              <p className="text-muted-foreground leading-relaxed">
                The{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  botResponse
                </code>{' '}
                field is required and will be sent to the customer as a bot
                message.{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  adminTakeover
                </code>{' '}
                is optional and defaults to{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  false
                </code>
                ; when set to{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  true
                </code>
                , pesan-ai marks the conversation for admin takeover before
                sending the bot response.
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                Return a non-2xx status only when pesan-ai should treat the
                webhook call as failed. Client errors are not retried, except{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  429
                </code>
                . Rate limits and server errors are retried up to 3 times with a
                1 second linear delay.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
