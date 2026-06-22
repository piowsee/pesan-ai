import { withApiAdmin } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { CreateUserSchema } from '@/schemas/create-user.schema';
import { CreateUserService } from '@/services/create-user.service';

/**
 * @route POST /api/admin/create-user
 * @body { email: string, name: string, role: "user" | "admin", password?: string }
 * @response { status: 'success', data: { user: User, onboardingEmailSent?: boolean, resent?: boolean } }
 * @access Admin only
 * @description Creates a user or resends onboarding when the user already exists but still needs onboarding.
 */
export const POST = withApiAdmin(async ({ req }) => {
  const rawBody = await req.json();
  const body = CreateUserSchema.parse(rawBody);
  const result = await CreateUserService.createUserOrResendOnboarding(body);

  return jsend.success(result);
});
