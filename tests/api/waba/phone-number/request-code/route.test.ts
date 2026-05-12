import { POST } from '@/app/api/waba/phone-number/request-code/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { PhoneRegistrationService } from '@/services/phone-registration.service';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/auth-api-helper');
vi.mock('@/services/phone-registration.service');

describe(
  'POST /api/waba/phone-number/request-code',
  { tags: ['backend'] },
  () => {
    const url = 'http://localhost/api/waba/phone-number/request-code';

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
      vi.mocked(
        PhoneRegistrationService.requestVerificationCode,
      ).mockResolvedValue({ success: true });

      const response = await POST(
        createRequest({
          phoneNumberId: 'phone-1',
          wabaId: 'waba-1',
          codeMethod: 'SMS',
        }),
        { params: Promise.resolve({}) } as never,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data).toBeNull();
      expect(
        PhoneRegistrationService.requestVerificationCode,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        codeMethod: 'SMS',
        language: 'en_US',
      });
    });

    it('returns 400 on validation failure', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
        role: 'user',
      } as never);

      const response = await POST(
        createRequest({
          wabaId: 'waba-1',
        }),
        { params: Promise.resolve({}) } as never,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('fail');
      expect(
        PhoneRegistrationService.requestVerificationCode,
      ).not.toHaveBeenCalled();
    });

    it('returns 500 when unauthorized', async () => {
      vi.mocked(AuthHelper.requireUser).mockRejectedValue(
        new Error('Unauthorized'),
      );

      const response = await POST(
        createRequest({
          phoneNumberId: 'phone-1',
          wabaId: 'waba-1',
        }),
        { params: Promise.resolve({}) } as never,
      );

      expect(response.status).toBe(500);
    });
  },
);
