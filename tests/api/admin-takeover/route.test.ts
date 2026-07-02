import { PATCH } from '@/app/api/admin-takeover/route';
import { ApiError } from '@/lib/api-helper/error';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { ConversationService } from '@/services/conversation.service';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: PATCH /api/admin-takeover
 * Reasoning: Ensures normal authenticated users can update takeover state only
 * through the service layer and invalid payloads are rejected.
 */

describe('PATCH /api/admin-takeover', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/admin-takeover';

  const createRequest = (body: unknown) => {
    return new Request(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  };

  it('updates admin takeover for an owned conversation', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(ConversationService.updateAdminTakeoverStatus).mockResolvedValue({
      conversationId: 'conv-1',
      adminTakeover: true,
    });

    const response = await PATCH(
      createRequest({
        conversationId: 'conv-1',
        wabaId: 'waba-1',
        adminTakeover: true,
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data).toEqual({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
    expect(ConversationService.updateAdminTakeoverStatus).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      adminTakeover: true,
    });
  });

  it('returns 400 for invalid payload', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const response = await PATCH(createRequest({ conversationId: 'conv-1' }), {
      params: Promise.resolve({}),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(data.data.adminTakeover).toBeDefined();
    expect(
      ConversationService.updateAdminTakeoverStatus,
    ).not.toHaveBeenCalled();
  });

  it('returns 404 when service rejects ownership', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(ConversationService.updateAdminTakeoverStatus).mockRejectedValue(
      new ApiError('Conversation not found or access denied', 404),
    );

    const response = await PATCH(
      createRequest({
        conversationId: 'conv-1',
        wabaId: 'waba-1',
        adminTakeover: true,
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(404);
  });
});
