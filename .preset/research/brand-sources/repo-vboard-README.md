# vboard

Events and community for VIT (Vidyalankar Institute of Technology, Mumbai), by [voss-labs](https://github.com/voss-labs).

Clubs post events. Students register with one tap. No more copy-pasted Google Forms in the WhatsApp group.

## Stack

| Layer      | Choice                                                   |
| ---------- | -------------------------------------------------------- |
| Framework  | Next.js 16 App Router, React 19                          |
| Language   | TypeScript (strict)                                      |
| Styling    | Tailwind CSS 4, shadcn (base-nova), Geist                |
| Database   | PostgreSQL on Neon, Drizzle ORM                          |
| Auth       | VOSS (OIDC) via Better Auth, no passwords                |
| Quality    | ESLint, Prettier, Vitest                                 |
| Deploy     | Vercel, migrations via GitHub Actions                    |

## Getting started

```bash
npm install
npm run dev:setup
npm run dev
```

`dev:setup` creates `.env.local`, starts Postgres in Docker, pushes the schema and loads demo data: five communities with full teams, upcoming, past and cancelled events, and about 370 registrations.

Open http://localhost:3000/login and pick a persona: super admin, site admin, community lead, manager, volunteer, or student. Each one sees a different dashboard, resolved from the database exactly as in production. See [docs/local-dev.md](./docs/local-dev.md), and [docs/voss-auth.md](./docs/voss-auth.md) for connecting a real VOSS client.

## Scripts

| Script                 | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Dev server with Turbopack                           |
| `npm run build`        | Production build                                    |
| `npm run check`        | Typecheck, lint, format check, and tests            |
| `npm run fix`          | Autofix lint and formatting                         |
| `npm run db:generate`  | Generate a migration from schema changes            |
| `npm run db:push`      | Push the schema directly (development)              |
| `npm run db:migrate`   | Apply pending SQL migrations (production)           |
| `npm run db:studio`    | Open Drizzle Studio                                 |
| `npm run dev:setup`    | Fresh clone to a seeded local database, one command |
| `npm run dev:seed`     | Wipe and reseed the local database                  |

## Project structure

```text
src/
  app/            routes, layout, globals.css (design tokens)
  components/     app components
    ui/           vendored shadcn primitives
  db/
    schema/       Drizzle tables, one file per domain
    queries/      data access, one file per domain
    migrations/   SQL migrations
  lib/            auth, email, formatting helpers and their tests
docs/             UI/UX spec, local dev, design snapshot
research/         plan and future work
scripts/          operational scripts
```

## What is in the MVP

- **Public site**: discover feed, calendar, communities, event pages with one-tap registration, approval queues and location gating
- **Dashboard** (shadcn `dashboard-01` block): overview, my registrations, profile
- **Community tools**: posts and events (draft, publish, pin, cancel, complete, delete), registrations with bulk approve / reject / check-in and CSV export, team management, settings
- **Admin**: create and archive communities, appoint leads, people and site roles, audit log

## Docs

- [research/plan.md](./research/plan.md) — the v1 plan
- [research/future.md](./research/future.md) — deferred work
- [research/rbac.md](./research/rbac.md) — roles, capabilities and the RBAC roadmap
- [docs/voss-auth.md](./docs/voss-auth.md) — VOSS sign-in and client registration
- [docs/UI_UX_SPEC.md](./docs/UI_UX_SPEC.md) — design system
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](./LICENSE)
