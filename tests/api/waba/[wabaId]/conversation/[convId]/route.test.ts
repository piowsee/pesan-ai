import { GET } from '@/app/api/waba/[wabaId]/conversation/[convId]/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { ApiError } from '@/lib/error';
import { ChatService } from '@/services/chat.service';
import { describe, expect, it, vi } from 'vitest';

describe(
  'GET /api/waba/:wabaId/conversation/:convId',
  { tags: ['backend'] },
  () => {
    const wabaId = 'waba-123';
    const convId = 'conv-123';
    const url = `http://localhost/api/waba/${wabaId}/conversation/${convId}`;

    it('returns 200 and conversation detail on success', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
      } as never);
      vi.mocked(ChatService.getChatDetail).mockResolvedValue({
        id: 'conv-123',
        messages: [],
      } as never);

      const req = new Request(url);
      const response = await GET(req, {
        params: Promise.resolve({ wabaId, convId }),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.conversation).toEqual({ id: 'conv-123', messages: [] });
      expect(ChatService.getChatDetail).toHaveBeenCalledWith(
        convId,
        wabaId,
        'user-1',
      );
    });

    it('returns 404 when ChatService throws ApiError', async () => {
      vi.mocked(AuthHelper.requireUser).mockResolvedValue({
        id: 'user-1',
      } as never);
      vi.mocked(ChatService.getChatDetail).mockRejectedValue(
        new ApiError('Conversation not found or access denied', 404),
      );

      const req = new Request(url);
      const response = await GET(req, {
        params: Promise.resolve({ wabaId, convId }),
      } as never);

      expect(response.status).toBe(404);
    });

    it('returns 500 when unauthorized', async () => {
      vi.mocked(AuthHelper.requireUser).mockRejectedValue(
        new Error('Unauthorized'),
      );

      const req = new Request(url);
      const response = await GET(req, {
        params: Promise.resolve({ wabaId, convId }),
      } as never);

      expect(response.status).toBe(500);
    });
  },
);
