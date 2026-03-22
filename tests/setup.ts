import { vi } from 'vitest';

// Global mock for logger
vi.mock('@/logger/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

// Global mock for encryption
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn((val) => val),
  decrypt: vi.fn((val) => val),
}));

// Global mock for Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    whatsappBusinessAccount: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    phoneNumber: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    botWebhook: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Global mock for Auth helper (only used in API route tests)
vi.mock('@/lib/auth/auth-api-helper', () => ({
  AuthHelper: {
    requireUser: vi.fn(),
    requireAdmin: vi.fn(),
  },
}));

// Global environment variables that are repetitive
process.env.META_WEBHOOK_SECRET = 'secret';
process.env.META_APP_SECRET = 'app-secret';

// --- Mocks for Repositories ---
vi.mock('@/repositories/chat.repository', () => ({
  ChatRepository: {
    findAllByWabaId: vi.fn(),
    findById: vi.fn(),
    getChatMetaForSending: vi.fn(),
    saveMessage: vi.fn(),
    findPhoneNumberByMetaId: vi.fn(),
    processIncomingMessage: vi.fn(),
  },
}));

vi.mock('@/repositories/waba.repository', () => ({
  WabaRepository: {
    findAllByUserId: vi.fn(),
    findAll: vi.fn(),
    findPaginated: vi.fn(),
    findPaginatedByUserId: vi.fn(),
    getTotalUnreadListByUserId: vi.fn(),
    findById: vi.fn(),
    updateWabaWebhook: vi.fn(),
  },
}));

vi.mock('@/repositories/webhook.repository', () => ({
  WebhookRepository: {
    createWebhook: vi.fn(),
    findAll: vi.fn(),
    findPaginated: vi.fn(),
    deleteWebhook: vi.fn(),
  },
}));

// --- Mocks for Services ---
vi.mock('@/services/chat.service', () => ({
  ChatService: {
    getChatsByWabaId: vi.fn(),
    getChatDetail: vi.fn(),
    sendAdminMessage: vi.fn(),
    processMetaWebhookPayload: vi.fn(),
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
