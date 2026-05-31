# Frontend Data and Realtime Patterns

This file describes local client-data and workflow-state conventions. Use it with `tanstack-query-best-practices` for deeper React Query guidance, `next-best-practices` for App Router details, and `shadcn` or `frontend-design` for component-level UI work.

## Query Layer Conventions

- Each feature hook file owns:
  - API fetchers
  - query key factories
  - query options
  - exported hooks
  - feature-local response mapping
- Keep API-to-UI normalization at the hook boundary, not scattered across components.
- Use `queryOptions(...)` and explicit key factories for reusable list queries.
- Use `keepPreviousData` for paginated tables and management pages.
- Use `staleTime: Infinity` only when the cache is maintained manually, as in chat.
- Remember that `QueryProvider` already sets a 5 minute default `staleTime`, 1 hour `gcTime`, and disables refetch-on-focus globally.

Relevant lib folders for frontend work:

- `src/lib/chat/*` for chat-specific formatting and chat-domain helpers
- `src/lib/api-helper/error.ts` and `src/lib/api-helper/jsend.ts` for JSend-aware client error handling
- `src/lib/i18n-helper/*` for locale or metadata helpers used by localized pages
- `src/lib/utils.ts` for shared presentation helpers like `cn(...)`.

## Mutation and Cache Rules

- Prefer invalidating a stable feature root key for simple CRUD flows.
- Use `setQueryData` for chat flows that need immediate UI updates.
- Throw user-readable `Error` instances from fetchers and mutation functions.
- Let components or mutation handlers own the toast behavior.
- Use invalidation for straightforward CRUD and manual cache updates only where the user experience really needs local immediacy.

## Workflow State Rules

- Rich, navigable workflows in this repo prefer URL-backed state over hidden local-only state.
- Search params are used as durable workflow state when deep-linking, refresh persistence, or back/forward behavior matter.
- Persist workflow state to local storage only when the page already uses that pattern and it improves recovery.
- When updating URL state from the client, prefer `startTransition(() => router.replace(..., { scroll: false }))`.
- Only call `router.replace` when the resulting URL actually changes.

Do not replace durable workflow state with duplicated local state unless there is a strong reason.

## Realtime Rules

- `RealtimeProvider` owns the single `EventSource('/api/sse')` connection.
- Feature-level hooks and components should register intent with the provider rather than open additional EventSource connections.
- SSE updates should flow through cache updates, not ad hoc DOM or component-local patches.
- Read-receipt or visibility-sensitive behavior should stay coordinated in one place when possible.

If you add new realtime event types, extend the provider instead of opening a second EventSource in a leaf component.

## Data Shaping Rules

- Normalize API responses at the hook boundary.
- Keep server-response shape and UI-consumption shape separate when needed.
- Preserve ordering rules and optimistic-update rules where the UI depends on them.

## ID Usage on the Frontend

This is a common source of mistakes:

- `useWabas()` returns both internal `id` and Meta `wabaId`.
- Chat and admin selection flows usually use the internal `id`.
- Phone number creation, request-code, verify-code, and embedded signup flows use the Meta `wabaId`.
- The WABA management UI passes the Meta `wabaId` into phone-number dialogs and signup actions on purpose.
- The webhook-assignment admin flow uses the internal WABA `id`.

Always inspect the consuming API route before deciding which ID to send.

## Layout and Interaction Constraints

- Dashboard layout includes a fixed mobile bottom nav, so mobile pages need bottom breathing room.
- Dense operator workflows should stay fast and utilitarian rather than being redesigned into marketing-style layouts.
- Keep dashboard data fetching inside hooks, not server components, unless the page already follows a server-first pattern.

## Frontend Change Checklist

- Reuse or extend an existing hook before creating a new fetch layer.
- Keep normalization inside the hook file.
- Use stable query keys.
- Use cache updates or invalidation intentionally.
- Preserve chat URL-state and SSE behavior.
- Add or update tests when client logic changes in a meaningful way.
