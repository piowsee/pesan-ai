---
name: UI-user
description: Use when improving pesan-ai user-facing pages, especially dashboard, WABA, chat, onboarding, and other workflows intended for non-technical operators. Apply the existing brand tokens, write clear Indonesian product copy, and keep status colors calm rather than bright solid red or green.
---

# pesan-ai User UI

## Product Lens

Design user pages for business operators who may not understand technical terms. The UI should explain what is safe, what needs attention, and what action to take next.

Prefer Indonesian copy for user-facing dashboard workflows unless the surrounding page is already consistently English.

## Visual Direction

- Respect the existing brand tokens in `src/app/globals.css`; do not redefine brand colors unless the user explicitly asks.
- Use `brand`/existing blue-slate accents for primary actions and important focus states.
- For success and danger states, use muted blue-adjacent tones, not loud pure green or red.
- Keep operational pages compact, scannable, and calm. Avoid landing-page hero styling.
- Follow the landing page's clean style: `text-brand`, thin `border-brand/*`, generous section spacing, and restrained motion/details.
- **Homepage pattern**: Use open sections (`<section className="mb-10">`) with lightweight text labels (`text-sm font-semibold text-brand/80`) instead of wrapping every group in a shadcn `Card`.
- **Card Styling**: Interactive or informative tiles should be standalone surfaces using `rounded-lg border border-brand/15 bg-card p-5 shadow-sm`. For hover effects, prefer elevation (`hover:-translate-y-0.5 hover:shadow-md`) over border color changes. Grid layouts should use `gap-5`.
- **Icons**: Keep icons bare and proportional (e.g., `size-6`). Do **not** wrap them in tinted background containers (`bg-.../10`), as it breaks proportionality.
- **Tooltips**: Tooltip trigger icons (`!`) should be placed on individual cards, not on section labels. Use `text-brand transition hover:text-brand/80` for high visibility. Tooltip content must be professional and admin-focused (e.g., "Total akun terintegrasi...", not "Gunakan ini untuk...").
- Reserve shadcn `Card` for detail pages or modals where a bordered panel genuinely separates content from the page context.
- Do **not** add decorative accent bars (colored lines at tile tops). Base card backgrounds should use a subtle tint like `bg-brand/5` instead of stark white, giving a softer look.
- Avoid excessive divider lines. Use soft surfaces, stat tiles, and whitespace before adding borders.

## UX Rules

- Replace technical labels with user outcomes when possible.
- Put the recommended next action near the top of the page.
- Keep visible copy short. Move longer explanations behind a `!`/info tooltip.
- Explain status numbers in plain language: what the number means and why the user should care.
- Avoid duplicate or low-value buttons; use one primary action and quiet text links where possible.
- Give dashboard pages enough top breathing room inside the sidebar layout; avoid content starting too close to the top edge.
- Do not link to placeholder routes that do not exist.
- Keep mobile bottom navigation clear and avoid content being clipped by fixed nav.

## Project Pointers

- User dashboard route: `src/app/(user-page)/dashboard/page.tsx`
- Dashboard shell: `src/app/(user-page)/dashboard/layout.tsx`
- Main user homepage panels:
  - `src/components/dashboard/welcome-header.tsx`
  - `src/components/dashboard/waba-status-cards.tsx`
  - `src/components/dashboard/quick-actions.tsx`
- Shared UI follows shadcn-style components in `src/components/ui`.
