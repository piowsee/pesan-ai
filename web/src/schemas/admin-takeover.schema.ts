import { z } from 'zod';

export const AdminTakeoverSchema = z.object({
  conversationId: z.string().min(1, 'Conversation id is required'),
  wabaId: z.string().min(1, 'WABA id is required'),
  adminTakeover: z.boolean(),
});

export type AdminTakeoverPayload = z.infer<typeof AdminTakeoverSchema>;
