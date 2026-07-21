import { BusinessProfileRepository } from '@/repositories/business-profile.repository';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { WhatsappBusinessProfileService } from '@/services/phone-number.service/whatsapp-business-profile';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('WhatsappBusinessProfileService', () => {
  const mockSystemUserToken = 'encrypted_valid-token';
  const mockPhoneNumberId = 'phone-123';
  const mockWabaId = 'waba-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWhatsAppBusinessProfile', () => {
    it('should return cached profile if not stale', async () => {
      vi.mocked(WabaRepository.findById).mockResolvedValue({
        id: 'waba-db-123',
        wabaId: mockWabaId,
        userId: mockUserId,
        systemUserToken: mockSystemUserToken,
      } as never);

      const cachedProfile = {
        id: 'profile-1',
        messagingProduct: 'whatsapp',
        updatedAt: new Date(), // fresh
      };
      vi.mocked(BusinessProfileRepository.getBusinessProfile).mockResolvedValue(
        cachedProfile as never,
      );

      vi.mocked(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-db-123',
        wabaId: mockWabaId,
      } as never);

      const result =
        await WhatsappBusinessProfileService.getWhatsAppBusinessProfile({
          phoneNumberId: mockPhoneNumberId,
          userId: mockUserId,
        });

      expect(result).toEqual(cachedProfile);
      expect(MetaFetchService.fetchBusinessProfile).not.toHaveBeenCalled();
    });

    it('should refetch from Meta if profile is stale', async () => {
      vi.mocked(WabaRepository.findById).mockResolvedValue({
        id: 'waba-db-123',
        wabaId: mockWabaId,
        userId: mockUserId,
        systemUserToken: mockSystemUserToken,
      } as never);

      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const staleProfile = {
        id: 'profile-1',
        messagingProduct: 'whatsapp',
        updatedAt: twoDaysAgo,
      };
      vi.mocked(
        BusinessProfileRepository.getBusinessProfile,
      ).mockResolvedValueOnce(staleProfile as never);

      const metaProfile = {
        messaging_product: 'whatsapp' as const,
        about: 'New about',
        websites: [],
      };
      vi.mocked(MetaFetchService.fetchBusinessProfile).mockResolvedValue(
        metaProfile,
      );

      const newSavedProfile = {
        id: 'profile-1',
        messagingProduct: 'whatsapp',
        about: 'New about',
        updatedAt: new Date(),
      };
      vi.mocked(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-db-123', wabaId: mockWabaId } as never);
      vi.mocked(
        BusinessProfileRepository.upsertBusinessProfile,
      ).mockResolvedValue({ businessProfile: newSavedProfile } as never);

      const result =
        await WhatsappBusinessProfileService.getWhatsAppBusinessProfile({
          phoneNumberId: mockPhoneNumberId,
          userId: mockUserId,
        });

      expect(MetaFetchService.fetchBusinessProfile).toHaveBeenCalledWith({
        phoneNumberId: mockPhoneNumberId,
        token: 'encrypted_valid-token',
      });
      expect(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).toHaveBeenCalledWith(mockPhoneNumberId);
      expect(
        BusinessProfileRepository.upsertBusinessProfile,
      ).toHaveBeenCalled();
      expect(result).toEqual(newSavedProfile);
    });
  });

  describe('updateWhatsAppBusinessProfile', () => {
    it('should update profile via Meta and sync DB', async () => {
      vi.mocked(WabaRepository.findById).mockResolvedValue({
        id: 'waba-db-123',
        wabaId: mockWabaId,
        userId: mockUserId,
        systemUserToken: mockSystemUserToken,
      } as never);

      const updateData = {
        messaging_product: 'whatsapp' as const,
        about: 'Updated about',
      };

      vi.mocked(MetaFetchService.updateBusinessProfile).mockResolvedValue({
        success: true,
      });

      const metaProfile = {
        messaging_product: 'whatsapp' as const,
        about: 'Updated about',
        websites: [],
      };
      vi.mocked(MetaFetchService.fetchBusinessProfile).mockResolvedValue(
        metaProfile,
      );

      const newSavedProfile = {
        id: 'profile-1',
        messagingProduct: 'whatsapp',
        about: 'Updated about',
        updatedAt: new Date(),
      };
      vi.mocked(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-db-123', wabaId: mockWabaId } as never);
      vi.mocked(
        BusinessProfileRepository.upsertBusinessProfile,
      ).mockResolvedValue({ businessProfile: newSavedProfile } as never);

      const result =
        await WhatsappBusinessProfileService.updateWhatsAppBusinessProfile({
          phoneNumberId: mockPhoneNumberId,
          userId: mockUserId,
          data: updateData,
        });

      expect(MetaFetchService.updateBusinessProfile).toHaveBeenCalledWith({
        phoneNumberId: mockPhoneNumberId,
        token: 'encrypted_valid-token',
        data: updateData,
      });
      expect(
        PhoneNumberRepository.findPhoneNumberByMetaId,
      ).toHaveBeenCalledWith(mockPhoneNumberId);
      expect(
        BusinessProfileRepository.upsertBusinessProfile,
      ).toHaveBeenCalled();
      expect(result).toEqual(newSavedProfile);
    });
  });
});
