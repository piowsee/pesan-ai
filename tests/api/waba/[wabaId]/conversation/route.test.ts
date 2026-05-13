import { GET } from '@/app/api/waba/[wabaId]/conversation/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { ApiError } from '@/lib/error';
import { ConversationService } from '@/services/conversation.service';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: GET /api/waba/:wabaId/conversation
 * Reasoning: Validate endpoint format and unauthorized mapping (404 when returning null)
 * from the ConversationService layer.
 */

describe('GET /api/waba/:wabaId/conversation', { tags: ['backend'] }, () => {
  const wabaId = 'waba-123';
  const url = `http://localhost/api/waba/${wabaId}/conversation`;

  it('returns chats when authorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(ConversationService.getAllConversations).mockResolvedValue({
      conversations: [{ id: 'conv-1' }],
      total: 1,
    } as never);

    const req = new Request(url);
    const response = await GET(req, {
      params: Promise.resolve({ wabaId }),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBeGreaterThanOrEqual(1);
    expect(data.data.chats).toEqual([{ id: 'conv-1' }]);
    expect(ConversationService.getAllConversations).toHaveBeenCalledWith({
      wabaId,
      userId: 'user-1',
    });
  });

  it('returns 404 when access is denied or WABA not found', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    vi.mocked(ConversationService.getAllConversations).mockRejectedValue(
      new ApiError('WABA not found or access denied', 404),
    );

    const req = new Request(url);
    const response = await GET(req, {
      params: Promise.resolve({ wabaId }),
    } as never);

    expect(response.status).toBe(404);
  });

  it('returns 500 when unauthorized or failing', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request(url);
    const response = await GET(req, {
      params: Promise.resolve({ wabaId }),
    } as never);

    // api-handler catches generic errors and returns 500 by default unless ApiError
    expect(response.status).toBe(500);
  });
});
