import { POST } from '@/app/api/waba/phone-number/verify-code/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { PhoneRegistrationService } from '@/services/phone-registration.service';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/auth-api-helper');
vi.mock('@/services/phone-registration.service');

describe(
  'POST /api/waba/phone-number/verify-code',
  { tags: ['backend'] },
  () => {
    const url = 'http://localhost/api/waba/phone-number/verify-code';

    const createRequest = (body: unknown) =>
      new Request(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

    it('returns 200 on success', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
        role: 'user',
      } as never);
      vi.mocked(PhoneRegistrationService.verifyAndRegister).mockResolvedValue({
        success: true,
      });

      const response = await POST(
        createRequest({
          phoneNumberId: 'phone-1',
          wabaId: 'waba-1',
          code: '123456',
        }),
        { params: Promise.resolve({}) } as never,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data).toBeNull();
      expect(PhoneRegistrationService.verifyAndRegister).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        code: '123456',
      });
    });

    it('returns 400 on validation failure', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
        role: 'user',
      } as never);

      const response = await POST(
        createRequest({
          phoneNumberId: 'phone-1',
          wabaId: 'waba-1',
          code: '12', // too short
        }),
        { params: Promise.resolve({}) } as never,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('fail');
      expect(PhoneRegistrationService.verifyAndRegister).not.toHaveBeenCalled();
    });

    it('returns 500 when unauthorized', async () => {
      vi.mocked(AuthHelper.requireUser).mockRejectedValue(
        new Error('Unauthorized'),
      );

      const response = await POST(
        createRequest({
          phoneNumberId: 'phone-1',
          wabaId: 'waba-1',
          code: '123456',
        }),
        { params: Promise.resolve({}) } as never,
      );

      expect(response.status).toBe(500);
    });
  },
);
