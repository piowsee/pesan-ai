# Pesan AI - Monorepo

Pesan AI is a simple CRM built for the WhatsApp Cloud API. This repository is a
[pnpm workspace](https://pnpm.io/workspaces) monorepo.

## Structure

```
.
├── web/     # Next.js web app (package: pesan-ai) - see web/README.md
├── docs/    # mdBook documentation (package: pesan-ai-docs)
└── ...      # shared tooling: prettier, husky, lint-staged, changesets, CI, Docker
```

## Prerequisites

- Node.js (v24.14.0 recommended, v22+ compatible)
- **pnpm** (v11+)
- PostgreSQL Database (for the web app)
- `make` (optional, for the convenience targets below)

## Quickstart

First-time setup (installs dependencies, generates the Prisma client, and scaffolds `web/.env`):

```bash
make setup            # or, deps only: pnpm install
```

Then fill in `web/.env` and start the app with `make web-dev`.

The [`Makefile`](Makefile) wraps the common web-app workflow (run `make help` for the full list):

| Task                       | Make                | Raw command                                                     |
| -------------------------- | ------------------- | --------------------------------------------------------------- |
| First-time setup           | `make setup`        | `pnpm install && pnpm --filter pesan-ai exec prisma generate`   |
| Run the web app            | `make web-dev`      | `pnpm --filter pesan-ai dev`                                    |
| Build the web app          | `make web-build`    | `pnpm --filter pesan-ai build`                                  |
| Start the built web app    | `make web-start`    | `pnpm --filter pesan-ai start`                                  |
| Test the web app           | `make web-test`     | `pnpm --filter pesan-ai test`                                   |
| Run all tests              | `make test`         | aggregates every package's tests (web only for now)             |
| Build the Docker image     | `make docker-build` | `docker build -f .deployment/app/Dockerfile -t pesanai:local .` |
| Remove deps & build output | `make clean`        | —                                                               |

## Documentation

- Web app: [`web/README.md`](web/README.md)
- Guide-book / docs: [`docs/`](docs/)

## License

This project is licensed under the GNU General Public License v3.0. See [`LICENSE`](LICENSE) for details.
