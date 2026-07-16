import 'dotenv/config';
import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

// Global mock for logger
vi.mock('@/lib/server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

// Global mock for encryption
vi.mock('@/lib/server/encryption', () => ({
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

vi.mock('@/lib/chat/event-bus', async () => {
  const actual = await vi.importActual('@/lib/chat/event-bus');
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
process.env.NEXT_PUBLIC_META_APP_ID = 'test-app-id';

// --- Mocks for Repositories ---
vi.mock('@/repositories/conversation.repository', () => ({
  ConversationRepository: {
    findAllByWabaId: vi.fn(),
    findById: vi.fn(),
    getConversationMetaForSending: vi.fn(),
    markConversationAsRead: vi.fn(),
    findConversationById: vi.fn(),
    updateAdminTakeoverStatus: vi.fn(),
    prepareWebhookMessageConversation: vi.fn(),
  },
}));
vi.mock('@/repositories/contact.repository', () => ({
  ContactRepository: {
    findConversationContacts: vi.fn(),
    upsertContact: vi.fn(),
    upsertContactsBulk: vi.fn(),
  },
}));

vi.mock('@/repositories/business-profile.repository', () => ({
  BusinessProfileRepository: {
    upsertBusinessProfile: vi.fn(),
    getBusinessProfile: vi.fn(),
  },
}));

vi.mock('@/repositories/message.repository', () => ({
  MessageRepository: {
    findConversationMessageHistory: vi.fn(),
    findMessagesPaginated: vi.fn(),
    saveMessage: vi.fn(),
    updateStatusesByMetaMessageIds: vi.fn(),
    updateMediaPlaceholder: vi.fn(),
    findMessageConversationId: vi.fn(),
    processHistoryMessage: vi.fn(),
    processIncomingMessage: vi.fn(),
    processOutgoingMessageEcho: vi.fn(),
    processBulkHistoryThread: vi.fn(),
  },
}));

vi.mock('@/repositories/waba.repository', () => ({
  WabaRepository: {
    findAllByUserId: vi.fn(),
    findPaginated: vi.fn(),
    findPaginatedByUserId: vi.fn(),
    getTotalUnreadListByUserId: vi.fn(),
    findById: vi.fn(),
    findByMetaWabaId: vi.fn(),
    updateStatusByMetaWabaId: vi.fn(),
    upsertWaba: vi.fn(),
  },
}));

vi.mock('@/repositories/phone-number.repository', () => ({
  PhoneNumberRepository: {
    findPhoneNumberByMetaId: vi.fn(),

    updateWabaWebhook: vi.fn(),
    upsertPhoneNumber: vi.fn(),
  },
}));

vi.mock('@/repositories/webhook.repository', () => ({
  WebhookRepository: {
    createWebhook: vi.fn(),
    findPaginated: vi.fn(),
    findWebhookByConversationId: vi.fn(),
    deleteWebhook: vi.fn(),
  },
}));

vi.mock('@/repositories/sync-request.repository', () => ({
  SyncRequestRepository: {
    createSyncRequest: vi.fn(),
    updateSyncRequestStatus: vi.fn(),
    findByRequestId: vi.fn(),
    findPendingByPhoneNumberId: vi.fn(),
  },
}));

// --- Mocks for Services ---
vi.mock('@/services/conversation.service', () => ({
  flattenContactObject: vi.fn((conversation) => {
    const { contact, ...conversationWithoutContact } = conversation;

    return {
      ...conversationWithoutContact,
      customerPhone: contact?.customerPhone ?? null,
      customerName: contact?.customerName ?? null,
      customerUsername: contact?.customerUsername ?? null,
    };
  }),
  ConversationService: {
    getAllConversations: vi.fn(),
    getChatDetail: vi.fn(),
    markAsRead: vi.fn(),
    updateAdminTakeoverStatus: vi.fn(),
  },
}));

vi.mock('@/services/message.service', () => ({
  MessageService: {
    getMessagesPaginated: vi.fn(),
    sendAdminTextMessage: vi.fn(),
    confirmUploadedMediaMessage: vi.fn(),
  },
}));

vi.mock('@/services/meta-webhook-handler.service', () => ({
  MetaWebhookHandlerService: {
    isValidSignature: vi.fn(),
    getUnprocessedWebhookResponse: vi.fn(),
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

vi.mock('@/services/embedded-signup.service', () => ({
  EmbeddedSignUpService: {
    completeEmbeddedSignup: vi.fn(),
    _exchangeCodeForToken: vi.fn(),
    _fetchWabaDetails: vi.fn(),
    _fetchPhoneNumberDetails: vi.fn(),
    _deregisterPhoneNumber: vi.fn(),
    _registerPhoneNumber: vi.fn(),
    _registerPhoneNumberWithRecovery: vi.fn(),
    _subscribeWabaApps: vi.fn(),
  },
}));

vi.mock('@/services/phone-number.service', () => ({
  PhoneNumberService: {
    requestVerificationCode: vi.fn(),
    verifyAndRegister: vi.fn(),
    createPhoneNumber: vi.fn(),
    _generateRegistrationPin: vi.fn(),
    getWhatsAppBusinessProfile: vi.fn(),
    updateWhatsAppBusinessProfile: vi.fn(),
  },
}));

vi.mock('@/services/customer-contact.service', () => ({
  CustomerContactService: {
    getCustomerContacts: vi.fn(),
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

vi.mock('@/services/s3.service', () => ({
  S3Service: {
    createPresignedUploadUrl: vi.fn(),
    createPresignedDownloadUrl: vi.fn(),
    verifyUploadedMedia: vi.fn(),
    streamWhatsAppMediaToObjectStorage: vi.fn(),
  },
}));
vi.mock('@/services/meta-fetch.service', () => ({
  MetaFetchService: {
    exchangeCodeForToken: vi.fn(),
    fetchWabaDetails: vi.fn(),
    fetchPhoneNumberDetails: vi.fn(),
    fetchBusinessProfile: vi.fn(),
    updateBusinessProfile: vi.fn(),
    registerPhoneNumber: vi.fn(),
    deregisterPhoneNumber: vi.fn(),
    setPhoneNumberPin: vi.fn(),
    subscribeWabaApps: vi.fn(),
    createPhoneNumber: vi.fn(),
    requestVerificationCode: vi.fn(),
    verifyCode: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

vi.mock('@/services/create-user.service');

vi.mock('@/services/contact-us.service', () => ({
  ContactUsService: {
    submitRequest: vi.fn(),
  },
}));

vi.mock('@/services/redirect-message.service', () => ({
  redirectMessageToExternalWebhook: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('@/lib/auth/auth', () => ({
  auth: {
    api: {
      createUser: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      listUsers: vi.fn(),
      sendVerificationEmail: vi.fn(),
    },
  },
  createResetPasswordCallbackUrl: vi.fn(),
}));

vi.mock('@/services/debouncer.service', () => ({
  DebouncerService: {
    handleDebounceIncomingMessage: vi.fn(),
    handleDebounceAutoCloseConversation: vi.fn(),
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
