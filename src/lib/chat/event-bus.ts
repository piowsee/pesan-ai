import { EventEmitter } from 'events';

export const SSE_EVENTS = {
  BOT_WEBHOOK_FAILED: 'BOT_WEBHOOK_FAILED',
  NEW_MESSAGE: 'NEW_MESSAGE',
} as const;

/**
 * Singleton event emitter for application-wide notifications.
 * NOTE: This works only for single-instance deployments.
 * For horizontal scaling, use Redis Pub/Sub.
 */
class GlobalEventBus extends EventEmitter {}

// ─── Singleton Pattern for Next.js ──────────────────────────────────
// HMR creates new instances of local variables. We store the bus on
// the global object to keep the same instance across hot reloads.
const globalForEventBus = global as unknown as { eventBus: GlobalEventBus };

const eventBus = globalForEventBus.eventBus ?? new GlobalEventBus();

if (process.env.NODE_ENV !== 'production') {
  globalForEventBus.eventBus = eventBus;
}

eventBus.setMaxListeners(20);

/**
 * Standardizes the event name for a specific user to enable targeted subscriptions.
 */
export const getUserEvent = (event: string, userId: string) =>
  `${event}:${userId}`;

export default eventBus;
