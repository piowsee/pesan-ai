# pesan-ai User UI

This file describes the general UI direction for the project. It should guide tone, density, and interaction style, not document every screen.

## Product Lens

Design user pages for business operators who may not understand technical terms. The UI should explain what is safe, what needs attention, and what action to take next.

Match the language of the surrounding screen. The current protected operator flows are mostly English, while public pages are locale-driven through `next-intl`. Do not force Indonesian into an otherwise English operator flow unless the user explicitly wants it or the surrounding feature is already localized.

## Visual Direction

- Respect the existing brand tokens in `src/app/globals.css`; do not redefine brand colors unless the user explicitly asks.
- Use `brand`/existing blue-slate accents for primary actions and important focus states.
- For success and danger states, prefer calmer tones and softer surfaces over loud pure green or red fills.
- Keep operational pages compact, scannable, and calm. Avoid landing-page hero styling.
- Follow the landing page's clean style: `text-brand`, thin `border-brand/*`, generous section spacing, and restrained motion/details.
- **Overview page pattern**: Use open sections (`<section className="mb-10">`) with lightweight text labels (`text-sm font-semibold text-brand/80`) instead of wrapping every group in a shadcn `Card`.
- **Card Styling**: Interactive or informative tiles should be standalone surfaces using `rounded-lg border border-brand/15 bg-card p-5 shadow-sm`. For hover effects, prefer elevation (`hover:-translate-y-0.5 hover:shadow-md`) over border color changes. Grid layouts should use `gap-5`.
- **Icons**: Keep icons bare and proportional (e.g., `size-6`). Do **not** wrap them in tinted background containers (`bg-.../10`), as it breaks proportionality.
- **Tooltips**: Tooltip trigger icons (`!`) should be placed on individual cards, not on section labels. Use `text-brand transition hover:text-brand/80` for high visibility. Tooltip content must be professional and operator-focused, and should match the surrounding page language.
- Reserve shadcn `Card` for detail pages or modals where a bordered panel genuinely separates content from the page context.
- Do **not** add decorative accent bars (colored lines at tile tops). Base card backgrounds should use a subtle tint like `bg-brand/5` instead of stark white, giving a softer look.
- Avoid excessive divider lines. Use soft surfaces, stat tiles, and whitespace before adding borders.

## UX Rules

- Replace technical labels with user outcomes when possible.
- Put the recommended next action near the top of the page.
- Keep visible copy short. Move longer explanations behind a `!`/info tooltip.
- Explain status numbers in plain language: what the number means and why the user should care.
- If Meta or WABA jargon must appear, pair it with plain-language context.
- Avoid duplicate or low-value buttons; use one primary action and quiet text links where possible.
- Give dashboard pages enough top breathing room inside the sidebar layout; avoid content starting too close to the top edge.
- Do not link to placeholder routes that do not exist.
- Keep mobile bottom navigation clear and avoid content being clipped by fixed nav.
- Preserve dense, high-utility workflows in operational screens. This product is a workspace, not a marketing page.

## Interaction Style

- Favor calm, readable, high-signal layouts.
- Make the recommended next action easy to find.
- Use status, counts, and labels to reduce operator uncertainty.
- Empty states should explain the next action, not just the absence of data.
- Tooling-heavy pages can be denser than public pages as long as hierarchy stays clear.

## Scope Reminder

- Use this file for project-level UI direction.
- Use `shadcn` for component composition rules.
- Use `frontend-design` when creating or reworking larger UIs.
- Prefer reading the target page or component directly for screen-specific details instead of expanding this skill into a feature catalog.
