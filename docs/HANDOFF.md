# Working state: Data Room MVP

A document for picking the work back up after a context reset.

## What this is

A take-home assignment: an MVP of a virtual data room (folders, files,
sharing). It was built against a specification and a 22-task plan written in
earlier planning sessions; those documents were working artifacts and are no
longer kept in the repository. The code departs from that plan in places;
every deviation is described below and in the commit messages.

## Done

Backend (tasks 1–3, 5–10) and frontend (11–20) are **closed and verified in
the browser**. The end-to-end scenario works: sign-up → room → folders → PDF
upload → viewing → sharing by link and by email → public view → search →
trash with restore.

## Remaining

| # | Task | Needs the user |
| --- | --- | --- |
| 21 | Deployment: API on Render, frontend on Vercel, database on Supabase | yes: accounts |
| 22 | README (design decisions, ERD, How it scales, AI note) | no |

Task 4 (Google sign-in) was dropped from scope on 2026-08-23.

## How to run it

```bash
npm run dev:api    # http://localhost:3000, Swagger at /docs
npm run dev:web    # http://localhost:5173
```

The database is now the **Supabase Postgres** of the same project (session
pooler, port 5432); the connection string lives in `apps/api/.env`, which is
not committed. Supabase is also **the file storage**, bucket
`dataroom-files`.

There are no seeded demo accounts in this database: the local Postgres that
held `demo@acme.com` was replaced by Supabase, which starts empty. Sign up
through the UI, or create a demo account for the reviewer before submitting.

Useful commands in `apps/web`: `npm run typecheck`, `npm run lint`
(oxlint + the boundary check), `npm run boundaries`, `npm run api:types`
(type generation from Swagger, needs the API running).

## Deviations from the plan worth knowing

**Prisma 7, not 5.** The `prisma-client` generator emits TypeScript into
`src/generated/prisma`; the connection string lives in `prisma.config.ts`; the
runtime goes through the `@prisma/adapter-pg` driver adapter. The generator
must have `moduleFormat = "cjs"` — otherwise Node loads the client as ESM and
crashes. Models are imported from the barrel `src/common/prisma/client.ts`,
not from `@prisma/client`.

**The Prisma adapter connects with `options: '-c timezone=UTC'`.** Without it
every date in the API shifts by the database session's time zone offset.

**Enum values in the Prisma schema go one per line.** A single-line form is
not valid.

**`tsBuildInfoFile` lives inside `dist`.** Otherwise `deleteOutDir` wipes the
output, the cache survives, and the build emits nothing at all.

**Upload, viewer, search and trash live inside `features/items`** rather than
as separate features: they do not exist without items and need the same cache
keys. Separate features would create cross-feature imports, which the
boundary check forbids.

**Bulletproof boundaries are guarded by our own script**
`apps/web/scripts/check-boundaries.mjs`, because oxlint (this template's
default linter) has no `import/no-restricted-paths`. The rule: shared layer →
features → app, and no imports between features.

**`cn` lives in `lib/utils.ts`** — the shadcn convention; otherwise it
rewrites components on every `add`.

**TypeScript is pinned to 5.9** — `openapi-typescript` does not support 6.x.

**Vite: `resolve.dedupe` for react and `strictPort: true`.** The first saves
us from two copies of React in the monorepo, the second keeps the dev server
from quietly coming up on a different port.

**Storybook is installed without the vitest integration.** `storybook init`
drags in `@storybook/addon-vitest`, chromatic, playwright and rewrites
`vite.config.ts` for browser tests. All of that was removed; what remains is
`storybook`, `@storybook/tanstack-react`, `addon-docs` and `addon-a11y`, with
`vite.config.ts` restored from git. Stories sit next to their components.
Run with `npm run storybook` in `apps/web`, port 6006.

**Comments and UI copy are in English.** The project was written in Ukrainian
first and translated wholesale on 2026-08-23; commit messages before that
date are still Ukrainian.

## Known gaps

**Swagger does not describe responses.** `0 of 27` operations have a response
schema, because controllers return plain TS interfaces. The consequence:
generated types only protect **request** bodies, and a reviewer looking at
`/docs` cannot see what comes back. Fixing it means response classes with
`@ApiProperty` — roughly an hour of work. Worth doing before submission.

**`npm audit` reports 3 high** findings in `deepmerge-ts`, via the Prisma CLI
(a devDependency). We are on the latest version, there is no fix, and
`audit fix --force` would downgrade Prisma across a major version. Mentioned
in the README.

**Search is available to the room owner only.** A viewer with access to a
large folder cannot search inside it.

**`Item.createdById` uses `RESTRICT`** — a user cannot be deleted while items
they created still exist. Account deletion is out of MVP scope.

**Renaming a room does not rename its root folder.** Invisible today, because
breadcrumbs take the name from the room.

**A retried upload creates a second row.** The retry starts from step 1, so
the abandoned `PENDING` row holds the name until the hourly cleanup, and the
file lands as `name (1).pdf`.

## How we work

**Antivibe.** Description and clarifying questions first, then code, then a
review window after each task. Never move to the next task without the user
saying so.

**Verification before closing a task.** Not only types and a build, but real
behaviour in the browser and a clean console. After verifying — **stop the
servers** (ports 3000 and 5173 must stay free for the user).

**Commits** are per task, staging explicit paths rather than `git add -A`:
that once committed an unfinished change of the user's.

**Browser environment quirks.** The pane does not composite frames, so
screenshots, coordinate clicks and `IntersectionObserver` do not work. Drive
the page through `javascript_tool` and read state from the DOM. The console
may contain entries from old tabs — open a new one for a clean check.

**Long bash heredocs break** on files over ~200 lines and mangle template
literals containing `${}` and backticks. Write large files with the write
tool, and make targeted edits with the editor.
