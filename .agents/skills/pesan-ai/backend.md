# Backend Patterns

This file describes local backend conventions. Use it with `next-best-practices` for deeper Next.js route-handler and runtime guidance, and with `vitest` for test-writing mechanics.

## Default Request Flow

1. Route handler authenticates through `withApiAuth` or `withApiAdmin`.
2. Route parses `req.json()` or query params with a Zod schema or shared helper.
3. Route calls a service in `src/services`.
4. Service applies business rules, ownership checks, logging, token handling, external API calls, and orchestration.
5. Repository performs Prisma reads and writes.
6. Route returns `jsend.success(...)`.

If a route starts accumulating branching business logic, move that logic into a service.

## Local Boundaries

- `src/lib/api-helper/*` is for HTTP response shape, API errors, pagination, and route wrappers.
- `src/lib/server/*` is for server-only infra such as Prisma, logging, encryption, and retry helpers.
- `src/lib/auth/*` is for auth session checks and better-auth setup.
- `src/repositories/*` is for Prisma only.
- `src/services/*` is for orchestration and business rules.

## Route Handler Rules

- Keep handlers thin and declarative.
- Use `withApiAuth` for authenticated user routes and `withApiAdmin` for admin-only routes.
- Use `getPaginationParams` for `page` and `limit`.
- Use `Schema.parse(...)` when a straight throw is fine.
- Use `safeParse(...)` when you need a custom branch before throwing.
- Return `jsend.success(...)` from normal flows.
- Let `api-handler` translate `ApiError`, `ZodError`, and Prisma known errors into HTTP responses.

## Error Model

- Throw `ApiError` for expected business failures such as ownership, missing records, conflicts, or upstream failures.
- `src/lib/api-helper/api-handler.ts` maps:
  - `ApiError` to `jsend.fail`
  - `ZodError` to field-level `jsend.fail`
  - Prisma `P2002` to 400
  - Prisma `P2025` to 404
  - everything else to 500 `jsend.error`
- Client hooks usually surface `body?.data?.message` or `extractJSendErrorMessage(...)`.

Use generic `Error` only for unexpected failures.

## ID Conventions

This repo mixes internal database IDs and provider-facing IDs. Verify which one a flow expects before wiring a route, hook, repository query, or external API call.

| Identifier | Field | Common usage |
| --- | --- | --- |
| Internal WABA ID | `WhatsappBusinessAccount.id` | Chat routes, WABA list selection, webhook assignment, unread totals |
| Meta WABA ID | `WhatsappBusinessAccount.wabaId` | Embedded signup, phone-number creation and verification, Meta Graph calls |
| Internal phone ID | `PhoneNumber.id` | Prisma relations, unread counter updates, conversation ownership |
| Meta phone ID | `PhoneNumber.phoneNumberId` | Meta webhook payloads, send/register/verify flows |
| Meta message ID | `Message.messageId` | WhatsApp `wamid.*` identifier, may be `null` before confirmation |

## Repository Rules

- Repositories own Prisma. Keep `Request`, `Response`, auth, and `NextResponse` out of them.
- Return plain data structures shaped for services, not HTTP responses.
- Reuse `include` and `select` constants when a relation shape repeats.
- Use `$transaction` for multi-step writes that must stay consistent.
- Prefer `upsert` for Meta synchronization and idempotent flows.
- When pagination and distinct counts conflict, follow the current `groupBy` pattern from `CustomerPhoneNumberRepository`.
- Keep ownership filters close to the query, not only in the route layer.
- Favor stable, reusable query shapes over feature-local ad hoc Prisma logic.

## Service Rules

- Services own business logic and orchestration.
- Log important start and success milestones with `logger`.
- Use `logError` when recovering from or recording partial failures.
- Decrypt stored credentials only in the service layer when needed for an upstream call.
- Map upstream failures to `ApiError` with explicit statuses, typically 502 for bad upstream responses.
- Use `@better-fetch/fetch` (`betterFetch` or `createFetch`) for all external HTTP API calls, not just Meta. Do not use raw `fetch`; Better Fetch provides automatic retry, typed responses, and consistent error handling.
- Use `Promise.all` for independent required calls and `Promise.allSettled` when partial success is acceptable.
- Emit realtime events only after the database write succeeds.

## Meta Integration Rules

- `MetaFetchService` is the external Graph API boundary.
- Use the Better Fetch instance in `MetaFetchService` for retryable Meta operations.
- Retryable responses are `429` or `>= 500`.
- Persist encrypted system user tokens and registration pins, not plaintext.
- If Meta registration with the stored PIN fails in embedded signup, the service may recover by setting a fallback PIN and retrying.

Keep Graph API payload construction inside services or the Meta service, not inside route handlers.

## Realtime Chat Rules

- Realtime events are routed through `src/lib/chat/event-bus.ts`.
- Server-side realtime emission happens after successful persistence.
- The SSE route subscribes per user, not as a global broadcast.
- `src/lib/chat/event-bus.ts` is single-instance only. If the app ever scales horizontally, this must move to Redis or another broker.

## Data Model Notes That Matter in Code

- Some business rules depend on compound uniqueness and ownership boundaries. Preserve those checks close to the query and transaction layer.
- Message ordering, unread counts, and provider-sync idempotency are part of backend behavior, so treat them as contract-sensitive when refactoring.

## Backend Change Checklist

- Add or update a Zod schema in `src/schemas` if request shape changes.
- Keep the route handler small.
- Put orchestration in a service.
- Put Prisma access in a repository.
- Return JSend responses.
- Add or update tests:
  - route test for HTTP contract
  - service test for orchestration
  - repository integration test for non-trivial query or transaction behavior
