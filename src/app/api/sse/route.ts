import { withApiAuth } from '@/lib/api-handler';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { logError, logger } from '@/logger/logger';

/**
 * @route GET /api/sse
 * @description Server-Sent Events endpoint for real-time notification/chat.
 * Connects the client to the application's internal event bus.
 */

export const GET = withApiAuth(async ({ req, user }) => {
  const userId = user.id;
  logger.info('New SSE connection established', { userId });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const onNewMessage = (payload: unknown) => {
        sendEvent(SSE_EVENTS.NEW_MESSAGE, payload);
      };

      // Subscribe ONLY to this user's messages
      const userEventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId);
      eventBus.on(userEventName, onNewMessage);

      // Keep-alive heartbeat every 30 seconds to prevent connection timeout
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          // Handle cases where the controller might be closed
          logger.warn('Heartbeat failed: stream closed', { userId });
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        logger.info('SSE connection aborted by client', { userId });
        clearInterval(keepAlive);
        eventBus.off(userEventName, onNewMessage);

        try {
          controller.close();
        } catch (err) {
          logError(err);
        }
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
});
