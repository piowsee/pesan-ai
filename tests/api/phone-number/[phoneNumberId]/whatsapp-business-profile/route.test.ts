import {
  GET,
  POST,
} from '@/app/api/phone-number/[phoneNumberId]/whatsapp-business-profile/route';
import { PhoneNumberService } from '@/services/phone-number.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/prisma', () => ({
  default: {},
}));

vi.mock('@/lib/api-helper/api-handler', () => ({
  withApiAuth:
    (
      handler: (args: {
        req: Request;
        user: { id: string };
        params: Record<string, string>;
      }) => Promise<Response>,
    ) =>
    async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
      const user = { id: 'user-123' };
      try {
        const params = await ctx.params;
        return await handler({ req, user, params });
      } catch (err: unknown) {
        const error = err as Error & { status?: number };
        return new Response(
          JSON.stringify({ status: 'error', message: error.message }),
          {
            status: error.status || 500,
          },
        );
      }
    },
}));

describe('WhatsApp Business Profile API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return business profile', async () => {
      const mockPhoneNumberId = 'phone-123';

      const mockProfile = { about: 'Hello' };
      vi.mocked(
        PhoneNumberService.getWhatsAppBusinessProfile,
      ).mockResolvedValue(mockProfile as never);

      const req = new Request('http://localhost');
      const response = await GET(req, {
        params: Promise.resolve({ phoneNumberId: mockPhoneNumberId }),
      } as never);
      const data = await response.json();

      expect(data).toEqual({ status: 'success', data: mockProfile });
      expect(
        PhoneNumberService.getWhatsAppBusinessProfile,
      ).toHaveBeenCalledWith({
        phoneNumberId: mockPhoneNumberId,
        userId: 'user-123',
      });
    });

    it('should return error if service throws', async () => {
      vi.mocked(
        PhoneNumberService.getWhatsAppBusinessProfile,
      ).mockRejectedValue(
        Object.assign(new Error('Phone number not found'), { status: 404 }),
      );

      const req = new Request('http://localhost');
      const response = await GET(req, {
        params: Promise.resolve({ phoneNumberId: 'invalid' }),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe('Phone number not found');
    });
  });

  describe('POST', () => {
    it('should update business profile', async () => {
      const mockPhoneNumberId = 'phone-123';
      const updateData = { messaging_product: 'whatsapp', about: 'Updated' };

      const mockProfile = { about: 'Updated' };
      vi.mocked(
        PhoneNumberService.updateWhatsAppBusinessProfile,
      ).mockResolvedValue(mockProfile as never);

      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(updateData),
      });
      const response = await POST(req, {
        params: Promise.resolve({ phoneNumberId: mockPhoneNumberId }),
      } as never);
      const data = await response.json();

      expect(data).toEqual({ status: 'success', data: mockProfile });
      expect(
        PhoneNumberService.updateWhatsAppBusinessProfile,
      ).toHaveBeenCalledWith({
        phoneNumberId: mockPhoneNumberId,
        userId: 'user-123',
        data: updateData,
      });
    });
  });
});
