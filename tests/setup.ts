import 'dotenv/config';
import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

// Global mock for logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

// Global mock for encryption
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn((val) => val),
  decrypt: vi.fn((val) => val),
}));

// Global mock for Auth helper (only used in API route tests)
vi.mock('@/lib/auth/auth-api-helper', () => ({
  AuthHelper: {
    requireUser: vi.fn(),
    requireAdmin: vi.fn(),
  },
}));

vi.mock('@/lib/event-bus', async () => {
  const actual = await vi.importActual('@/lib/event-bus');
  const mockBus = new EventEmitter();

  // Create spies while preserving EventEmitter functionality
  vi.spyOn(mockBus, 'on');
  vi.spyOn(mockBus, 'off');
  vi.spyOn(mockBus, 'emit');

  return {
    ...actual,
    __esModule: true,
    default: mockBus,
  };
});

// Global environment variables that are repetitive
process.env.META_WEBHOOK_SECRET = 'secret';
process.env.META_APP_SECRET = 'app-secret';
process.env.META_APP_ID = 'test-app-id';

// --- Mocks for Repositories ---
vi.mock('@/repositories/chat.repository', () => ({
  ChatRepository: {
    findAllByWabaId: vi.fn(),
    findById: vi.fn(),
    getChatMetaForSending: vi.fn(),
    findPhoneNumberByMetaId: vi.fn(),
    processIncomingMessage: vi.fn(),
  },
}));

vi.mock('@/repositories/message.repository', () => ({
  MessageRepository: {
    findMessagesPaginated: vi.fn(),
    saveMessage: vi.fn(),
  },
}));

vi.mock('@/repositories/waba.repository', () => ({
  WabaRepository: {
    findAllByUserId: vi.fn(),
    findPaginated: vi.fn(),
    findPaginatedByUserId: vi.fn(),
    getTotalUnreadListByUserId: vi.fn(),
    findById: vi.fn(),
    updateWabaWebhook: vi.fn(),
    upsertWaba: vi.fn(),
    upsertPhoneNumbers: vi.fn(),
  },
}));

vi.mock('@/repositories/webhook.repository', () => ({
  WebhookRepository: {
    createWebhook: vi.fn(),
    findPaginated: vi.fn(),
    deleteWebhook: vi.fn(),
  },
}));

// --- Mocks for Services ---
vi.mock('@/services/chat.service', () => ({
  ChatService: {
    getAllChats: vi.fn(),
    getChatDetail: vi.fn(),
    processMetaWebhookPayload: vi.fn(),
  },
}));

vi.mock('@/services/message.service', () => ({
  MessageService: {
    getMessagesPaginated: vi.fn(),
    sendAdminMessage: vi.fn(),
  },
}));

vi.mock('@/services/waba.service', () => ({
  WabaService: {
    getWabasByUserId: vi.fn(),
    getAllWabas: vi.fn(),
    getWabasPaginated: vi.fn(),
    getTotalUnreadListByUserId: vi.fn(),
    assignWebhookToWaba: vi.fn(),
  },
}));

vi.mock('@/services/embedded-signup.service', () => ({
  EmbeddedSignUpService: {
    exchangeToken: vi.fn(),
    _fetchWabaDetails: vi.fn(),
    _fetchPhoneNumberDetails: vi.fn(),
    _registerPhoneNumber: vi.fn(),
    _subscribeWabaApps: vi.fn(),
  },
}));

vi.mock('@/services/webhook.service', () => ({
  WebhookService: {
    _generateWebhookToken: vi.fn(),
    callWebhook: vi.fn(),
    validateWebhookUrl: vi.fn(),
    sendMessageToWebhook: vi.fn(),
    createWebhook: vi.fn(),
    getAllWebhooks: vi.fn(),
    getWebhooksPaginated: vi.fn(),
    deleteWebhook: vi.fn(),
  },
}));

vi.mock('@/services/whatsapp.service', () => ({
  WhatsappService: {
    sendTextMessage: vi.fn(),
  },
}));

// --- Mocks for Libraries ---
vi.mock('jose', () => ({
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return 'mock-jwt-token';
    }
  },
}));
