import { withApiAdmin } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { CreateUserSchema } from '@/schemas/create-user.schema';
import { CreateUserService } from '@/services/create-user.service';

export const POST = withApiAdmin(async ({ req }) => {
  const rawBody = await req.json();
  const body = CreateUserSchema.parse(rawBody);
  const result = await CreateUserService.createUserOrResendOnboarding(body);

  return jsend.success(result);
});
