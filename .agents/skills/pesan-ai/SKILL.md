---
name: pesan-ai
description: Repo-specific orientation for the pesan-ai codebase. Use it to understand project structure, local layering, lib folder conventions, ID and auth patterns, and testing expectations, then pair it with more specialized skills like next-best-practices, tanstack-query-best-practices, shadcn, frontend-design, vitest, or clean-code as needed.
user-invocable: false
---

# pesan-ai

This skill is the repo-context layer for this codebase. Use it before making architectural assumptions.

It is intentionally general. It should explain how this project is organized and which local patterns to follow. It should not try to document every feature or replace framework-specific guidance from other skills.

## Pairing

- Read [repo-map.md](./repo-map.md) first when you need project structure, route layout, auth, i18n, or shared providers.
- Read [backend.md](./backend.md) for local backend layering, API helper usage, service and repository boundaries, provider-ID conventions, and server-side patterns.
- Read [frontend-data.md](./frontend-data.md) for local client-data, cache, workflow-state, and realtime patterns.
- Read [ui-user.md](./ui-user.md) for operator-facing UI direction.
- Read [test.md](./test.md) whenever you change behavior. Default to updating tests in the same turn.

## Pair With Other Skills

- Next.js routes, layouts, RSC, metadata, runtime, or file conventions: also use `next-best-practices`.
- TanStack Query fetch, cache, mutation, or hydration work: also use `tanstack-query-best-practices`.
- shadcn/ui component usage or composition: also use `shadcn`.
- UI building or visual redesign: also use `frontend-design`.
- Test design and Vitest mechanics: also use `vitest`.
- Refactors, structure cleanup, and review work: also use `clean-code`.

If a specialized skill and this repo skill overlap, use `pesan-ai` for local conventions and the specialized skill for the deeper framework/tool rules.

## Non-Negotiables

- Keep route handlers thin. Parse input, call a service, return `jsend`.
- Put business logic in `src/services` and Prisma access in `src/repositories`.
- Reuse the existing helpers in `src/lib/api-helper`, `src/lib/server`, `src/lib/chat`, `src/lib/i18n-helper`, and `src/lib/auth` before adding new ones.
- Use `@better-fetch/fetch` (`betterFetch` or `createFetch`) for any external HTTP API call. Do not use raw `fetch` for external services; Better Fetch provides retry, typed errors, and consistent response handling.
- Do not edit `src/generated/prisma`; the generated client comes from `prisma/schema.prisma`.
- Be explicit about internal database IDs vs Meta IDs. This repo uses both, and mixing them causes subtle bugs.
- Prefer extending existing hooks and components over introducing parallel abstractions.
- If a change touches queries, business rules, or API behavior, add or update tests. Repository query changes should usually get a real DB-backed repository test.
- Repository tests use the real database, so they must be isolated: create unique test data, avoid hidden inter-test dependencies, and clean up everything they write.

## Task Routing

- Backend endpoint, auth, Prisma, or external-provider change: read `repo-map.md`, `backend.md`, and `test.md`, and usually pair with `next-best-practices`.
- Query, cache, workflow-state, or realtime change: read `repo-map.md`, `frontend-data.md`, and `test.md`, and usually pair with `tanstack-query-best-practices`.
- Operator UI or component work: read `repo-map.md`, `frontend-data.md`, and `ui-user.md`, and usually pair with `shadcn` or `frontend-design`.
- Test-heavy work: read `test.md` and pair with `vitest`.
- Broad feature work: read all reference files in this skill folder before editing.
