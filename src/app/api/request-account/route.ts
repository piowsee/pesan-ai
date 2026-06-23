import { ApiError } from '@/lib/api-helper/error';
import { jsend } from '@/lib/api-helper/jsend';
import { logError } from '@/lib/server/logger';
import { RequestAccountSchema } from '@/schemas/request-account.schema';
import { RequestAccountService } from '@/services/request-account.service';
import { ZodError } from 'zod';

function handleRequestAccountError(error: unknown, req: Request) {
  const action = `${req.method} ${new URL(req.url).pathname}`;
  logError(error, { action });

  if (error instanceof ApiError) {
    return jsend.fail({ message: error.message }, error.status);
  }

  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    const flatErrors: Record<string, string> = {};

    for (const [key, errors] of Object.entries(fieldErrors)) {
      flatErrors[key] =
        (errors as string[] | undefined)?.[0] || 'Invalid value';
    }

    return jsend.fail(flatErrors, 400);
  }

  return jsend.error(
    error instanceof Error ? error.message : 'Internal Server Error',
    500,
  );
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const body = RequestAccountSchema.parse(rawBody);
    const result = await RequestAccountService.sendRequest(body);

    return jsend.success(result);
  } catch (error) {
    return handleRequestAccountError(error, req);
  }
}
