# Pesan AI

Pesan AI is a simple CRM built for the WhatsApp Cloud API.

## Tech Stack

- **Framework:** [Next.js 16.2](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & ORM:** PostgreSQL & [Prisma v7](https://www.prisma.io/) (@prisma/adapter-pg)
- **Authentication:** [Better-Auth](https://better-auth.com/)
- **Language:** TypeScript
- **Tooling:** ESLint, Prettier, Husky, lint-staged

## Documentation

- **Page Structure:** For a detailed functional breakdown, see [`PAGE_STRUCTURE.md`](./PAGE_STRUCTURE.md).
- **API Documentation:** [Postman Documentation](https://documenter.getpostman.com/view/38554123/2sBXigMtFi)


## Getting Started

### Prerequisites

- Node.js (v24.14.0 recommended, v20+ compatible)
- **pnpm** (v10+)
- PostgreSQL Database

### Installation

1. Clone the repository and install dependencies using pnpm:

```bash
pnpm install
```

2. Set up your environment variables:
   Copy the `.env.example` file to `.env` and fill in your database credentials, NextAuth secrets, and WhatsApp API keys.

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

**Login Credentials:**
- **Password:** `password123`
- **Admin:** `admin@piowsee.com`
- **User:** `user@piowsee.com` (Associated with chat data)

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
