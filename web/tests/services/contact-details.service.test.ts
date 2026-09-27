import { ContactRepository } from '@/repositories/contact.repository';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { ContactDetailsService } from '@/services/contact-details.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/contact-details.service');

describe('ContactDetailsService', { tags: ['backend'] }, () => {
  const USER_ID = 'user-123';
  const WABA_ID = 'waba-123';
  const CONV_ID = 'conv-123';
  const CONTACT_ID = 'contact-123';

  beforeEach(() => {
    vi.mocked(ConversationRepository.findConversationById).mockResolvedValue({
      id: CONV_ID,
      contact: {
        id: CONTACT_ID,
        customerPhone: '628111',
        customerName: 'Test',
        customerUsername: null,
        bsuid: null,
        label: null,
        internalNotes: null,
        phoneNumberId: 'phone-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      messagingProduct: 'whatsapp',
      adminTakeover: false,
      lastMessageAt: null,
      lastCustomerMessageAt: null,
      unreadCount: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      phoneNumber: {
        id: 'phone-1',
        phoneNumberId: 'meta-phone-1',
        displayPhoneNumber: '+628111',
        wabaId: WABA_ID,
        businessProfile: null,
        waba: {
          id: WABA_ID,
          userId: USER_ID,
          systemUserToken: 'token',
        },
      },
    } as never);

    vi.mocked(ContactRepository.findContactByConversationId).mockResolvedValue({
      id: CONTACT_ID,
      label: null,
      internalNotes: null,
    });

    vi.mocked(ContactRepository.updateContactDetails).mockResolvedValue({
      label: 'vip',
      internalNotes: 'Test note',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateContactDetails', () => {
    it('updates label and notes after ownership check', async () => {
      const result = await ContactDetailsService.updateContactDetails({
        conversationId: CONV_ID,
        wabaId: WABA_ID,
        userId: USER_ID,
        label: 'vip',
        internalNotes: 'Test note',
      });

      expect(result).toEqual({
        label: 'vip',
        internalNotes: 'Test note',
      });
      expect(ContactRepository.updateContactDetails).toHaveBeenCalledWith({
        contactId: CONTACT_ID,
        label: 'vip',
        internalNotes: 'Test note',
      });
    });

    it('throws 404 when conversation is not owned', async () => {
      vi.mocked(ConversationRepository.findConversationById).mockResolvedValue(
        null,
      );

      await expect(
        ContactDetailsService.updateContactDetails({
          conversationId: CONV_ID,
          wabaId: WABA_ID,
          userId: USER_ID,
          label: 'vip',
        }),
      ).rejects.toThrow('Conversation not found or access denied');
    });

    it('passes null values through to clear fields', async () => {
      vi.mocked(ContactRepository.updateContactDetails).mockResolvedValue({
        label: null,
        internalNotes: null,
      });

      const result = await ContactDetailsService.updateContactDetails({
        conversationId: CONV_ID,
        wabaId: WABA_ID,
        userId: USER_ID,
        label: null,
        internalNotes: null,
      });

      expect(result.label).toBeNull();
      expect(result.internalNotes).toBeNull();
      expect(ContactRepository.updateContactDetails).toHaveBeenCalledWith({
        contactId: CONTACT_ID,
        label: null,
        internalNotes: null,
      });
    });
  });
});
