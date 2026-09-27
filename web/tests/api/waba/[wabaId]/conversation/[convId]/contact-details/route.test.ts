import { PATCH } from '@/app/api/waba/[wabaId]/conversation/[convId]/contact-details/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { ContactDetailsService } from '@/services/contact-details.service';
import { describe, expect, it, vi } from 'vitest';

function makeParams(wabaId: string, convId: string) {
  return { params: Promise.resolve({ wabaId, convId }) } as never;
}

describe(
  'PATCH /api/waba/:wabaId/conversation/:convId/contact-details',
  { tags: ['backend'] },
  () => {
    it('updates label and notes successfully', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
        role: 'user',
      } as never);
      vi.mocked(ContactDetailsService.updateContactDetails).mockResolvedValue({
        label: 'follow_up',
        internalNotes: 'Schedule callback',
      });

      const req = new Request(
        'http://localhost/api/waba/waba-1/conversation/conv-1/contact-details',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'follow_up',
            internalNotes: 'Schedule callback',
          }),
        },
      );
      const response = await PATCH(req, makeParams('waba-1', 'conv-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data.label).toBe('follow_up');
      expect(data.data.internalNotes).toBe('Schedule callback');
      expect(ContactDetailsService.updateContactDetails).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        label: 'follow_up',
        internalNotes: 'Schedule callback',
      });
    });

    it('clears label by setting it to null', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
        role: 'user',
      } as never);
      vi.mocked(ContactDetailsService.updateContactDetails).mockResolvedValue({
        label: null,
        internalNotes: null,
      });

      const req = new Request(
        'http://localhost/api/waba/waba-1/conversation/conv-1/contact-details',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: null, internalNotes: null }),
        },
      );
      const response = await PATCH(req, makeParams('waba-1', 'conv-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.label).toBeNull();
      expect(data.data.internalNotes).toBeNull();
    });

    it('returns 400 for validation errors', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
        role: 'user',
      } as never);

      const req = new Request(
        'http://localhost/api/waba/waba-1/conversation/conv-1/contact-details',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'x'.repeat(101), // exceeds 100 char limit
          }),
        },
      );
      const response = await PATCH(req, makeParams('waba-1', 'conv-1'));

      expect(response.status).toBe(400);
    });

    it('returns 500 when unauthorized', async () => {
      vi.mocked(AuthHelper.requireUser).mockRejectedValue(
        new Error('Unauthorized'),
      );

      const req = new Request(
        'http://localhost/api/waba/waba-1/conversation/conv-1/contact-details',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: 'vip' }),
        },
      );
      const response = await PATCH(req, makeParams('waba-1', 'conv-1'));

      expect(response.status).toBe(500);
    });
  },
);
