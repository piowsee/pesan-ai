import { EventEmitter } from 'events';

export const SSE_EVENTS = {
  NEW_MESSAGE: 'NEW_MESSAGE',
} as const;

/**
 * Singleton event emitter for application-wide notifications.
 * NOTE: This works only for single-instance deployments.
 * For horizontal scaling, use Redis Pub/Sub.
 */
class GlobalEventBus extends EventEmitter {}

const eventBus = new GlobalEventBus();

eventBus.setMaxListeners(10);

/**
 * Standardizes the event name for a specific user to enable targeted subscriptions.
 */
export const getUserEvent = (event: string, userId: string) =>
  `${event}:${userId}`;

export default eventBus;
