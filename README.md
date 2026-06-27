# Pesan AI

Pesan AI is a simple CRM built for the WhatsApp Cloud API.

## Tech Stack

- **Framework:** [Next.js 16.2.6](https://nextjs.org/) (App Router)
- **UI Library:** [React 19.2.3](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & ORM:** PostgreSQL, [Prisma 7.8](https://www.prisma.io/), and `@prisma/adapter-pg`
- **Authentication:** [Better Auth 1.6](https://better-auth.com/)
- **Data Fetching:** [TanStack Query v5](https://tanstack.com/query/latest)
- **Internationalization:** [next-intl v4](https://next-intl.dev/)
- **UI Components:** [shadcn](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), and [lucide-react](https://lucide.dev/)
- **Language:** TypeScript
- **Testing:** [Vitest](https://vitest.dev/) and Testing Library
- **Release Notes:** [Changesets](https://github.com/changesets/changesets)
- **Tooling:** pnpm, ESLint, Prettier, Husky, and lint-staged

## Getting Started

### Prerequisites

- Node.js (v24.14.0 recommended, v22+ compatible)
- **pnpm** (v11+)
- PostgreSQL Database

### Installation

1. Clone the repository and install dependencies using pnpm:

```bash
pnpm install
```

2. Set up your environment variables:
   Copy the `.env.example` file to `.env` and fill in your database credentials, Better Auth secrets, and WhatsApp API keys.

```bash
cp .env.example .env
```

3. Initialize the database and run Prisma generate:

```bash
pnpm prisma generate
```

4. Run the development server:

```bash
pnpm run dev
```

### Database Seeding (Optional)

To populate the database with test data (Admin & User accounts, WABA, Conversations):

> [!IMPORTANT]
> You **MUST** temporarily disable/comment out the `signUpEmail` pre-hook (Endpoint restriction) in `src/lib/auth/auth.ts` before seeding, as the script uses the signup API to create users with hashed passwords.

```bash
pnpm prisma db seed
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Changesets

Every pull request into `dev` must include a changeset.

Create one from your feature branch:

```bash
pnpm changeset
```

Choose the appropriate version bump and write a concise summary of the change. Commit the generated file under `.changeset/` with the PR.


## Documentation

Project Guide-Book/Docs lives in [`docs/`](docs/). Start with [`docs/README.md`](docs/README.md) for local docs setup and build instructions.

Release notes are tracked in [`CHANGELOG.md`](CHANGELOG.md).

## License

This project is licensed under the GNU General Public License v3.0. See [`LICENSE`](LICENSE) for details.
