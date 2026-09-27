import { ApiError } from '@/lib/api-helper/error';
import { PhoneNumberRepository } from '@/repositories/phone-number.repository';
import { WabaRepository } from '@/repositories/waba.repository';
import { WabaService } from '@/services/waba.service';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/waba.service');

/**
 * WabaService Tests
 * Reasoning: Test the service layer business logic containing transformations
 * and pagination logic, without running real database queries.
 */

// Provide minimal mock for logger
describe('WabaService', { tags: ['backend'] }, () => {
  describe('getWabasByUserId', () => {
    it('fetches and maps wabas correctly', async () => {
      vi.mocked(WabaRepository.findAllByUserId).mockResolvedValue([
        {
          id: 'waba-1',
          wabaId: 'meta-waba-1',
          phoneNumbers: [
            { id: 'pn-1', displayPhoneNumber: '+123', botWebhook: null },
          ],
        } as never,
      ]);

      const result = await WabaService.getWabasByUserId({ userId: 'user-1' });

      expect(result).toHaveLength(1);
      expect(result[0].wabaId).toBe('meta-waba-1');
      expect(result[0].phoneNumbers).toHaveLength(1);
      expect(result[0].phoneNumbers[0].displayPhoneNumber).toBe('+123');
    });
  });

  describe('getWabasPaginated', () => {
    it('returns mapped and paginated content for admin', async () => {
      vi.mocked(WabaRepository.findPaginated).mockResolvedValue({
        wabas: [
          { id: 'waba-1', wabaId: 'meta-waba-1', phoneNumbers: [] } as never,
        ],
        total: 1,
      });

      const result = await WabaService.getWabasPaginated({
        page: 3,
        limit: 10,
      });

      expect(result.wabas).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(WabaRepository.findPaginated).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      }); // page 3, limit 10 -> offset 2*10
    });

    it('returns mapped and paginated content for specific user', async () => {
      vi.mocked(WabaRepository.findPaginatedByUserId).mockResolvedValue({
        wabas: [{ id: 'waba-user1', wabaId: 'meta-123' } as never],
        total: 1,
      });

      const result = await WabaService.getWabasPaginated({
        page: 4,
        limit: 10,
        userId: 'user-1',
      });

      expect(result.wabas).toHaveLength(1);
      expect(WabaRepository.findPaginatedByUserId).toHaveBeenCalledWith({
        limit: 10,
        offset: 30,
        userId: 'user-1',
      });
    });
  });

  describe('assignWebhookToWaba', () => {
    it('throws 404 if waba is not found', async () => {
      vi.mocked(WabaRepository.findById).mockResolvedValue(null);

      await expect(
        WabaService.assignWebhookToWaba({
          wabaId: 'waba-404',
          webhookId: 'webhook-1',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('updates waba webhook successfully', async () => {
      vi.mocked(WabaRepository.findById).mockResolvedValue({
        id: 'waba-1',
      } as never);
      vi.mocked(PhoneNumberRepository.updateWabaWebhook).mockResolvedValue(
        {} as never,
      );

      const result = await WabaService.assignWebhookToWaba({
        wabaId: 'waba-1',
        webhookId: 'webhook-1',
      });

      expect(result.success).toBe(true);
      expect(PhoneNumberRepository.updateWabaWebhook).toHaveBeenCalledWith({
        wabaId: 'waba-1',
        botWebhookId: 'webhook-1',
      });
    });
  });
});
