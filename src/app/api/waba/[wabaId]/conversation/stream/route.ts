import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { subscribeToChatEvents } from '@/lib/chat-events';
import { WabaRepository } from '@/repositories/waba.repository';
import { type ChatStreamEvent } from '@/types/chat';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function createSsePayload(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wabaId: string }> },
) {
  try {
    const user = await AuthHelper.requireUser();
    const { wabaId } = await params;
    const ownedWaba = await WabaRepository.findByIdAndUserId(wabaId, user.id);

    if (!ownedWaba) {
      return new Response('Unauthorized', { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          controller.enqueue(encoder.encode(createSsePayload(event, payload)));
        };

        const onChatEvent = (event: ChatStreamEvent) => {
          send(event.type, event);
        };

        const unsubscribe = subscribeToChatEvents(wabaId, onChatEvent);
        const heartbeat = setInterval(() => {
          send('heartbeat', { ts: new Date().toISOString() });
        }, 15000);

        const close = () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {}
        };

        request.signal.addEventListener('abort', close);

        send('connected', {
          wabaId,
          ts: new Date().toISOString(),
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
}
