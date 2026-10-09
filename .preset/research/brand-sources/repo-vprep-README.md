# vprep

Past papers, notes, syllabus and resources for Vidyalankar students, in one place. Built by VOSS Labs.

Inspired by ACM VIT's [ExamCooker](https://github.com/ACM-VIT/ExamCooker).

## Stack

- Next.js 16 (App Router, Turbopack, React 19)
- TypeScript, Tailwind CSS v4, Geist Variable
- Drizzle ORM on Neon Postgres, schema namespaced to `vprep`
- Better Auth (email OTP via Resend, console fallback in dev)
- Cloudflare R2 for uploaded PDFs

## Dev

Requires Node 20.9 or newer, and npm.

```bash
cp .env.example .env
# fill DATABASE_URL and BETTER_AUTH_SECRET at minimum
npm install
npm run db:push        # creates the vprep pg schema and its tables
npm run db:seed        # optional, populates 71 real EXCS + FE courses
npm run dev
```

Auth without a Resend key runs in console mode. The one time code is logged to the terminal running `next dev`.

Uploads without R2 return a configuration error. Set the four `R2_*` env vars to enable file uploads. Everything else keeps working.

## Status

Foundation shipped. Currently:

- Landing renders with the VOSS design language
- Schema, auth, mail, R2 helpers and seed are in place
- Content browse, upload and moderator routes land in follow up pull requests

## Routes on the roadmap

- `/past_papers`, `/past_papers/[code]`, `/past_papers/[code]/paper/[id]`
- `/notes`, `/notes/course/[code]`, `/notes/[id]`
- `/syllabus`, `/syllabus/course/[code]`, `/syllabus/[id]`
- `/resources`, `/resources/course/[code]`, `/resources/[id]`
- `/past_papers/create`, `/notes/create`
- `/sign-in`, `/account`
- `/mod`, `/mod/papers/review`, `/mod/notes/review`
- `/api/auth/*`

## Contributing

Pick an issue tagged `good-first-issue` or open one describing the change. See `CONTRIBUTING.md`.

## Licence

MIT. See `LICENSE`.
