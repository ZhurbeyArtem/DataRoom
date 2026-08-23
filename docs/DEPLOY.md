# Deployment: Supabase + Render + Vercel

Three services, all on free tiers:

| What | Where | Why there |
| --- | --- | --- |
| Postgres | Supabase | The project already exists — the file bucket lives there. A second database would be pointless. |
| API (NestJS) | Render | Keeps a long-lived process: we run an in-process cron cleanup and a connection pool inside it. |
| Frontend (Vite SPA) | Vercel | Static assets on a CDN, zero configuration for Vite. |

The order is strict: **Supabase → Render → Vercel → back to Render.**
The last step is needed because `WEB_ORIGIN` for CORS is only known after
Vercel.

---

## Step 0. Prepare the repository

Four changes without which nothing builds.

**1. `apps/api/package.json` — build and start scripts:**

```json
"build": "prisma generate && nest build",
"start:prod": "prisma migrate deploy && node dist/main"
```

`prisma generate` in the build is mandatory: `src/generated/prisma` is
gitignored, so on the server the Prisma client simply does not exist until it
is generated.

`prisma migrate deploy` goes into **start**, not into the build: migrations
must run where the production database is reachable, exactly once per
deployment.

**2. `apps/web/vercel.json`** — so a direct visit to `/rooms/<id>` is not a
404:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**3. `apps/api/.env.example`** — the list of variables without values; the
Render fields are filled in from it.

**4. `render.yaml`** — optional: the same thing can be clicked together in the
dashboard. If you want infrastructure as code, it goes in the repository root.

---

## Step 1. Supabase: the database

The bucket is already configured; only the database of the same project is
needed.

1. **Connection string.** Project Settings → Database → Connection string →
   the **Session pooler** tab (`aws-0-<region>.pooler.supabase.com`, port
   `5432`).

   > **Do not take the Transaction pooler (port 6543).** `PrismaService`
   > connects with the startup parameter `options: '-c timezone=UTC'`, and a
   > pooler in transaction mode does not pass such parameters through — the
   > connection fails with `unsupported startup parameter: options`. Without
   > that parameter every date in the API shifts by the session's time zone
   > offset. The session pooler passes it through and, unlike a direct
   > connection, is reachable over IPv4.

2. **Run the migrations** — once, locally:

   ```bash
   cd apps/api && DATABASE_URL="<string from Supabase>" npx prisma migrate deploy
   ```

   This is optional: `start:prod` does it itself on the first boot on Render.
   Doing it locally is more convenient, because an error shows up immediately
   rather than in the logs.

3. **Bucket.** Storage → `dataroom-files`: private, 50 MB file size limit (the
   same one as in `CreateUploadUrlDto`), allowed type `application/pdf`.

---

## Step 2. Render: the API

**New → Web Service**, connect the repository.

| Field | Value |
| --- | --- |
| Root Directory | **empty** (repository root) |
| Build Command | `npm ci --include=dev && npm run build --workspace apps/api` |
| Start Command | `npm run start:prod --workspace apps/api` |
| Health Check Path | `/docs` |

The root directory is empty on purpose: this is an npm workspaces monorepo
with a **single** `package-lock.json` in the root. From `apps/api` the command
`npm ci` fails — there is no lockfile there.

> **The `--include=dev` trap.** We set `NODE_ENV=production` (without it the
> refresh cookie gets no `secure`/`sameSite=none`), and with that `NODE_ENV`
> `npm ci` skips `devDependencies` — meaning neither `nest` nor `prisma`. The
> build then dies with "nest: not found". The flag cancels that.

**Environment variables:**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the session pooler string from step 1 |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Project Settings → API keys → secret |
| `SUPABASE_BUCKET` | `dataroom-files` |
| `JWT_ACCESS_SECRET` | a **new** secret, not the one from your local `.env` |
| `JWT_REFRESH_SECRET` | another one |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL` | `30d` |
| `NODE_ENV` | `production` |
| `WEB_ORIGIN` | anything for now; the real value comes after step 3 |
| `PORT` | leave unset, Render supplies its own |

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

After the deploy, check that `https://<service>.onrender.com/docs` serves
Swagger.

---

## Step 3. Vercel: the frontend

**Add New → Project**, the same repository.

| Field | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Framework Preset | Vite |
| Build Command | `npm run build` (default) |
| Output Directory | `dist` (default) |
| Variable `VITE_API_URL` | `https://<service>.onrender.com` |

Vercel finds the monorepo's root lockfile and installs from there — no extra
configuration needed.

`VITE_API_URL` is baked into the bundle at build time rather than read at
runtime: changing it requires a new deployment, not a restart.

---

## Step 4. Wire it back

Return to Render and set `WEB_ORIGIN` to the exact Vercel domain:

```
https://<project>.vercel.app
```

No trailing slash. `main.ts` hands this string to `enableCors({ origin })`,
and the comparison there is character by character — one extra slash means no
request from the frontend gets through. Save, and Render restarts the service
itself.

---

## Step 5. Verify on the live URLs

The full scenario, in a normal window:

1. Sign up with a new account → you land in the room list.
2. Create a room, and a folder inside it.
3. Upload a PDF, wait for "done", open it in the viewer.
4. Share a link, open it in an **incognito** window.
5. Revoke access, refresh the incognito window → "This content is no longer
   available".
6. Delete a file, find it in the trash, restore it.
7. Reload the page — the session must come back without signing in again.

Step 7 matters most: it is the one that catches the cookie problem.

---

## Where this typically breaks

**CORS.** `WEB_ORIGIN` not matching the Vercel domain character for
character. Vercel preview deployments get different domains
(`<project>-<hash>.vercel.app`) and will not pass CORS — test on the
production domain.

**The refresh cookie.** The frontend and the API sit on different domains, so
the cookie is cross-site: it needs `secure: true` and `sameSite: 'none'`. The
code already does that, but **only when `NODE_ENV=production`** — forget the
variable and the cookie is not stored, so reloading the page bounces the user
to sign-in. The symptom is exactly that: signing in works, reloading does not.

Separately: browsers are progressively restricting third-party cookies. If
this ever stops working, the cure is a shared domain
(`app.example.com` and `api.example.com`), not a code change.

**Cold start.** The free Render tier puts a service to sleep after 15 minutes
of inactivity; the first request after that takes up to 50 seconds. This is
exactly why the app has skeletons everywhere — it looks slow rather than
broken. Worth a line in the README.

**Background cleanup sleeps with the service.** `CleanupService` is a cron
inside the API process. On a paid tier that is fine; on the free one a sweep
only happens while the service is awake. The consequence is mild: unfinished
uploads and old logs live longer than an hour and two weeks respectively.

**`prisma generate` forgotten in the build.** Fails at startup with "Cannot
find module ./generated/prisma" — which is precisely why it lives in `build`
rather than somewhere separate.

---

## After the deployment

- Put the live URLs into the README together with a demo account for the
  reviewer.
- Mention the known limitations in the README: cold start, search being
  owner-only, upload retries producing a "(1)" suffix, and the three `high`
  findings in `npm audit` coming from the Prisma CLI.
