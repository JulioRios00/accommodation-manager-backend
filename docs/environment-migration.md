# Migrating to the company accounts

Rebuilding the whole stack — EC2, Neon, Clerk, GitHub, Vercel, Resend, Sentry — under
company-owned accounts, then cutting over.

Written to be followed top to bottom. Each section says what to create, what to copy, and
how to prove it worked before moving on.

---

## Read this first: the two things that actually bite

Everything else here is account admin. These two are where a migration like this goes wrong.

### 1. New Clerk instance means new user IDs

Clerk user IDs (`user_2abc…`) are issued per instance. A new instance issues new ones, and
the database stores the old ones in five places:

| Table | Column | What breaks if it is stale |
|---|---|---|
| `residents` | `clerkUserId` | Resident can't see their own portal or raise tickets |
| `property_administrators` | `clerkUserId` | Administrator loses their property assignment |
| `maintenance_tickets` | `clerkUserId` | Ticket ownership and "raised by" |
| `ticket_activity_logs` | `clerkUserId` | Who did what on a ticket |
| `audit_logs` | `userId` | Activity Log attributes changes to an ID that no longer exists |

**Roles live in Clerk, not the database.** `ClerkAuthGuard.resolveRole` reads
`publicMetadata.role`, and **falls back to `'staff'` when it is missing**
(`clerk-auth.guard.ts:61`). So a user recreated without their metadata does not lose access —
they silently become staff. Nobody gets an error; permissions are just quietly wrong.

Plan for this explicitly — see [Step 4](#step-4--clerk).

### 2. Backend traffic is plain HTTP today

`ec2/nginx.conf` listens on port 80 only, and Vercel's rewrite proxies to it over the public
internet. Request logs confirm it: `x-forwarded-proto: http`.

Everything crossing that link is resident personal data — names, emails, phone numbers,
nationalities, personal IDs and IBANs. Rebuilding is the natural moment to fix it, and the
config already carries a commented-out TLS block. [Step 3](#step-3--ec2-backend-host) covers
it. If you choose to defer, do so as a decision with a date on it, not by omission.

---

## What exists today

| Piece | Current | Holds |
|---|---|---|
| Backend | EC2 `t3`-class Ubuntu, PM2 process `backend`, nginx :80 | App at `/home/ubuntu/app/backend` |
| Database | Neon PostgreSQL | All business data |
| Auth | Clerk | Users, roles in `publicMetadata.role` |
| Frontend | Vercel | Next.js 16, rewrites `/api/*` to the backend |
| Email | Resend | D+1 / D+4 rent escalation notices |
| Errors | Sentry | Backend and frontend |
| CI/CD | GitHub Actions → SSH → EC2 | `.github/workflows/deploy.yml` |
| Repos | `JulioRios00/accommodation-manager-backend`, `…-frontend` | Code |

### Environment variables

Backend (`/home/ubuntu/app/backend/.env`, template in `backend/.env.example`):

```
DATABASE_URL        Neon connection string (overrides the DB_* vars when set)
PORT                3001
NODE_ENV            production
CLERK_SECRET_KEY    Clerk backend key
CLERK_JWT_KEY       Clerk JWT public key — verifies tokens locally instead of
                    fetching JWKS per request, which was causing intermittent 401s
SENTRY_DSN          Backend Sentry project
RESEND_API_KEY      Omit and EmailService logs instead of sending
EMAIL_FROM_ADDRESS  Verified sender on the Resend domain
CORS_ORIGIN         The frontend URL, exactly
```

Frontend (Vercel project settings):

```
BACKEND_URL                        Server-side only. The rewrite target in next.config.ts
NEXT_PUBLIC_API_URL                Empty in production (the app then calls /api relatively)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  Clerk frontend key
CLERK_SECRET_KEY                   Clerk backend key, for the Next middleware
SENTRY_AUTH_TOKEN                  Source map upload at build time
```

GitHub Actions (backend repo):

```
secrets.EC2_HOST      Public IP or DNS of the box
secrets.EC2_USER      ubuntu
secrets.EC2_SSH_KEY   Private key whose public half is on the box
vars.EC2_APP_DIR      Optional, defaults to /home/ubuntu/app
vars.EC2_PM2_APP      Optional, defaults to backend
```

> `next.config.ts` falls back to an old Render URL when `BACKEND_URL` is unset. Nothing runs
> there any more, so a missing variable produces confusing failures against a dead host
> rather than an obvious error. Set it.

---

## Step 0 — before you start

- [ ] Company AWS, Neon, Clerk, Vercel, Resend, Sentry and GitHub accounts exist, with you as
      an admin on each.
- [ ] Decide the production hostname for the backend (needed for TLS in Step 3).
- [ ] Agree a cutover window. The database copy is the only part users will notice; the rest
      can be built alongside the live system.
- [ ] **Announce a freeze on imports and edits for the window.** The copy is a point in time;
      anything written to the old system after the dump is lost.

---

## Step 1 — GitHub

1. Create the two repositories under the company organisation.
2. Push every branch and tag:

   ```bash
   git remote add company git@github.com:<org>/accommodation-manager-backend.git
   git push company --all && git push company --tags
   ```
3. Repeat for the frontend.
4. Do **not** add the Actions secrets yet — the EC2 box they point at does not exist. Step 6.

Keep the old repositories until cutover is proven, then archive rather than delete: the
history is the only record of why several of these decisions were made.

---

## Step 2 — Neon (database)

1. Create the project in the company Neon account, PostgreSQL version matching the current
   one (check it in the old project's dashboard).
2. Copy the connection string, including `?sslmode=require`. The app connects with
   `ssl: { rejectUnauthorized: false }` (`database.module.ts:108`), so a plain Neon string
   works as-is.
3. **Do not pre-create any tables.** TypeORM runs with `synchronize: true`, so the schema is
   created from the entities on first boot. There are no migrations in this project.

### Copying the data

Take the dump during the freeze, not before:

```bash
# From the OLD connection string
pg_dump --no-owner --no-acl --format=custom \
  "postgresql://<old-connection-string>" -f accommodation-manager.dump

# Into the NEW one
pg_restore --no-owner --no-acl --clean --if-exists \
  -d "postgresql://<new-connection-string>" accommodation-manager.dump
```

Use a `pg_dump` whose major version is at least the server's, or it will refuse.

**Verify** — counts should match the old database exactly:

```sql
SELECT 'properties' t, count(*) FROM properties
UNION ALL SELECT 'beds', count(*) FROM beds
UNION ALL SELECT 'residents', count(*) FROM residents
UNION ALL SELECT 'bookings', count(*) FROM bookings
UNION ALL SELECT 'rent_payments', count(*) FROM rent_payments
UNION ALL SELECT 'deposit_transactions', count(*) FROM deposit_transactions
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs;
```

Three tables are configuration rather than business data, and are easy to forget because
nothing looks broken without them until someone hits a permission or an email:
`role_permissions`, `feature_flags`, `email_templates`. Confirm all three came across —
`email_templates` falls back to built-in defaults when empty, so edited wording would be
silently replaced by the originals.

---

## Step 3 — EC2 (backend host)

1. Launch Ubuntu 22.04, same instance size as the current box. Give it an **Elastic IP** —
   the GitHub secret and Vercel's rewrite both point at this address, and a reboot without
   one changes it.
2. Security group: inbound 22 (your IP only), 80 and 443 (anywhere). Nothing else. Port 3001
   stays closed — nginx is the only thing that should reach it.
3. Add your deploy key to `~/.ssh/authorized_keys`.
4. Run the bootstrap from this repo:

   ```bash
   git clone https://github.com/<org>/accommodation-manager-backend.git /home/ubuntu/app
   bash /home/ubuntu/app/backend/ec2/bootstrap.sh
   ```

   It installs Node 20, PM2, nginx and git, builds the app, installs the nginx site and the
   memory monitor, and prints what to do next. It does not start the app — `.env` is empty
   until you fill it.
5. Write `/home/ubuntu/app/backend/.env` from the table above. **In `backend/`, not the repo
   root** — the app calls `dotenv/config`, which reads relative to the working directory, and
   PM2 starts it from there.
6. Start it:

   ```bash
   cd /home/ubuntu/app/backend && pm2 start ec2/ecosystem.config.js && pm2 save && pm2 startup
   ```

   Use the ecosystem file rather than `pm2 start dist/main.js`: it carries `NODE_ENV`, `PORT`,
   the log paths and the memory cap. Starting without `NODE_ENV=production` makes the logger
   reach for `pino-pretty`, which `npm ci --omit=dev` does not install.

   Run the command `pm2 startup` prints, or the app will not come back after a reboot.

### TLS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <backend-hostname>
```

Point a DNS record at the Elastic IP first. Certbot rewrites the nginx config and installs a
renewal timer. Then set Vercel's `BACKEND_URL` to the `https://` address.

**Verify:**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/health   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://<backend-hostname>/api/health
```

`/api/health` is public and pings the database: **200** means up *and* connected to Postgres,
**503** means running but no database (check `DATABASE_URL`), connection refused means not
running.

---

## Step 4 — Clerk

The step that needs the most care. Read [the warning above](#1-new-clerk-instance-means-new-user-ids) first.

1. Create the application in the company Clerk account. Configure sign-in methods to match
   the current instance.
2. Copy both keys into the backend `.env` and the Vercel environment, plus `CLERK_JWT_KEY`
   from **Configure → API Keys → Advanced → JWT public key**. It is optional, but without it
   every request fetches Clerk's JWKS over the network, which has already caused intermittent
   401s here.
3. **Export the existing users before you touch anything**, including their IDs, email
   addresses and `publicMetadata`:

   ```bash
   curl -s -H "Authorization: Bearer $OLD_CLERK_SECRET_KEY" \
     'https://api.clerk.com/v1/users?limit=500' \
     | jq '[.[] | {id, email: .email_addresses[0].email_address, role: .public_metadata.role}]' \
     > clerk-users.json
   ```
4. Recreate each user in the new instance **with `publicMetadata.role` set**. A user created
   without it becomes `staff` silently.
5. **Re-link the database.** For every row holding a `clerkUserId`, map old ID to new by email
   address. For staff this is a handful of rows; for residents, `POST /api/import/residents-clerk`
   already creates Clerk users from resident records and writes the IDs back, which is the
   path of least resistance.

   `audit_logs.userId` is historical and cannot be re-linked meaningfully — old entries will
   reference IDs that no longer resolve. Decide whether to accept that (the change detail is
   still readable) or annotate it. Do not delete the rows.

**Verify:** sign in as one user per role — sysadmin, manager, administrator, staff,
maintenance — and confirm each sees what it should. A permissions problem here looks like
normal operation to the person who has it.

---

## Step 5 — Vercel, Resend, Sentry

**Vercel.** Import the company frontend repo, set the four environment variables for
Production and Preview, deploy. `NEXT_PUBLIC_API_URL` stays empty so the app calls `/api`
relatively and the rewrite does the rest.

**Resend.** Add and verify the sending domain (DNS records — allow for propagation), create
an API key, set `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`. Until the key is set, `EmailService`
logs instead of sending, so escalation appears to work while no resident receives anything.
Check the logs on the first run rather than assuming.

**Sentry.** Create a backend and a frontend project, set `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`.
The EC2 memory monitor reports through the same DSN once it is set.

---

## Step 6 — CI/CD

1. Add to the company backend repo: secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`; variables
   `EC2_APP_DIR` and `EC2_PM2_APP` only if they differ from the defaults.
2. Push a trivial change to `main`, or run **Deploy to EC2** from the Actions tab.
3. Expect `verify` (build + tests) then `deploy` (fetch, build, `pm2 reload`).

The workflow refuses to deploy when the box's checkout shares no history with `main`, and
when no PM2 process matches `EC2_PM2_APP`. Both are guards against the failure modes that
already cost this project four weeks — if either fires, read the message rather than forcing
past it.

---

## Step 7 — cutover

1. Freeze writes on the old system; tell users.
2. Take the dump and restore it (Step 2). The counts must match.
3. Point DNS at the new Elastic IP, or update Vercel's `BACKEND_URL` to the new backend.
4. Walk the checklist below.
5. Lift the freeze.

### Acceptance checklist

- [ ] `/api/health` returns 200 over HTTPS
- [ ] Sign in works for each of the five roles, with the right access
- [ ] Properties, Beds, Residents, Bookings all list data
- [ ] A booking can be created and deleted
- [ ] A rent payment can be edited and saved
- [ ] An XLSX import runs and reports sensible counts
- [ ] The overdue-emails report downloads
- [ ] Activity Log shows entries with resident and property links
- [ ] Sentry receives a deliberate test error from both projects
- [ ] A deploy from GitHub Actions reaches the box and reloads PM2

Keep the old stack running but idle for a fortnight. Decommission in this order: EC2
first (cheapest to rebuild), then Vercel, then Clerk, and **Neon last** — it is the only
thing holding data that cannot be recreated.

---

## Things that will catch you out

- **`.env` is not in git, by design.** Nothing in this runbook restores it. Copy the values
  out of the old box before you shut it down, and into a password manager, not a file.
- **The root `.gitignore` does not cover `.env`.** `git clean -fd` on the box would delete it.
  The deploy workflow is written to avoid this; do not add `-x` to that command.
- **`synchronize: true` is on in production.** The schema follows the entities on every boot.
  It means no migration step here, and it means an entity change reshapes the live database
  on deploy. Worth revisiting once the move is done, not during it.
- **Free-tier Neon suspends an idle database.** The first request after a pause is slow and
  can read as a failure. Check the plan matches the old project's.
- **Elastic IP or it will move.** The GitHub secret, Vercel's rewrite and any DNS record all
  point at that address.
