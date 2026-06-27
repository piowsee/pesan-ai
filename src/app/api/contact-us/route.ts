import { ApiError } from '@/lib/api-helper/error';
import { jsend } from '@/lib/api-helper/jsend';
import { logError } from '@/lib/server/logger';
import {
  createFixedWindowRateLimiter,
  getClientIp,
} from '@/lib/server/rate-limiter';
import { ContactUsSchema } from '@/schemas/contact-us.schema';
import { ContactUsService } from '@/services/contact-us.service';
import { ZodError } from 'zod';

const contactUsRateLimiter = createFixedWindowRateLimiter({
  maxRequests: 3,
  windowMs: 60_000,
});

function handleContactUsError(error: unknown, req: Request) {
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
    const rateLimit = contactUsRateLimiter.consume(getClientIp(req));

    if (!rateLimit.allowed) {
      const response = jsend.fail(
        { message: 'Too many requests. Please try again in a minute.' },
        429,
      );
      response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
      return response;
    }

    const rawBody = await req.json();
    const body = ContactUsSchema.parse(rawBody);
    const result = await ContactUsService.submitRequest(body);

    return jsend.success(result);
  } catch (error) {
    return handleContactUsError(error, req);
  }
}
