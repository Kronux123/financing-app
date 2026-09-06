# Docker setup — where we left off

Last worked on: 2026-09-06. Hand-written for learning, not generated — keep it that way.

---

## ⏸ RESUME HERE — mid-migration to WSL2

**Decision (2026-09-06):** development moves into WSL2 and **Herd is dropped for this project**.
Two reasons: Herd runs on SQLite while production is Postgres (`LIKE` case-sensitivity, type
affinity and JSON operators all differ — bugs that cannot show up locally), and bind-mounting from
`C:\` into WSL2 is slow for PHP's many-small-files access pattern. Same habit applies to the future
Next.js/NestJS work; **not** to C#, where Windows-native is the better default.

Nothing has been moved yet. `C:\Users\Rylef\Herd\financing-app` is untouched and stays until the
WSL copy is verified. WSL is Ubuntu 26.04, user `ryle`, home `/home/ryle`, 16 CPUs, 15 GiB.

### 0. Blocking, in the GUI

**Docker Desktop → Settings → Resources → WSL Integration → enable `Ubuntu` → Apply & Restart.**

Verify from Windows — it must print `/usr/bin/docker`, *not* a `/mnt/c/...` path:

```powershell
wsl -d Ubuntu -- bash -lc 'command -v docker'
```

Without this, `docker` inside WSL is Windows `docker.exe` found via PATH interop, and `-v $PWD:/app`
resolves against the *Windows* filesystem — silently mounting the wrong thing.

### 1. Clone into the Linux filesystem

Must live under `/home/ryle`, **never `/mnt/c`** — `/mnt/c` is the same slow boundary with extra steps.
Cloning from the local folder rather than GitHub because 7 commits are unpushed.

```sh
mkdir -p ~/code
git clone /mnt/c/Users/Rylef/Herd/financing-app ~/code/kept
cd ~/code/kept
git remote set-url origin https://github.com/Kronux123/financing-app.git
```

### 2. Carry the gitignored files git cannot

`.env.docker` is the critical one — without it `docker compose up` fails on a missing `env_file`.

```sh
SRC=/mnt/c/Users/Rylef/Herd/financing-app
cp "$SRC/.env.docker" "$SRC/.env" "$SRC/RELEASE-V1.md" ~/code/kept/
cp "$SRC/database/database.sqlite" ~/code/kept/database/
mkdir -p ~/code/kept/.claude && cp "$SRC/.claude/settings.local.json" ~/code/kept/.claude/
cp "$SRC"/storage/app/backup-*.json ~/code/kept/storage/app/
```

Deliberately **not** copied: `vendor/`, `node_modules/` (reinstall — wrong platform otherwise),
`resources/js/{actions,routes,wayfinder}/` and `storage/framework/views/` (all regenerated).

### 3. Node in Ubuntu (nvm), version 22 to match the Dockerfile

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec bash -l
nvm install 22 && node -v
```

### 4. Dependencies — no PHP needed in Ubuntu

```sh
cd ~/code/kept
docker run --rm -v "$PWD":/app -w /app composer:2 install
npm ci
```

### 5. Boot from the WSL path

⚠️ **Stop the Windows-side stack first.** Docker Desktop shares one daemon, and both sides use the
project name `kept` — so they are the *same* containers and the *same* `kept_pgdata` volume. Running
`up` from WSL while Windows' stack is up just recreates them with different mounts, which is
confusing rather than broken. Upside: the seeded demo data carries over for free.

```sh
# from Windows first:  docker compose down
docker compose up -d --build
docker compose ps
```

### 6. Measure — the number that justifies the move

```sh
curl -o /dev/null -s -w 'docker: %{time_total}s\n' http://localhost:8080/
```

Compare against the Herd URL from Windows. If the WSL figure is close to Herd's, the move paid off.

### 7. Then finish the dev override (unfinished from before the move)

- Write `docker/entrypoint.dev.sh`: `set -e`, then `config:clear` / `route:clear` / `view:clear`
  (not `optimize:clear` — that hits the database on every boot), then `exec docker-php-entrypoint "$@"`.
- Add `entrypoint: ["sh", "/app/docker/entrypoint.dev.sh"]` to `compose.dev.yaml`'s `x-dev` anchor.
  Invoke via `sh` so a bind-mounted file's exec bit never matters.
- **Compose's `entrypoint:` also clears the image's `CMD`** — so `app` needs an explicit `command:`
  with the FrankenPHP args (`--config /etc/frankenphp/Caddyfile --adapter caddyfile`). `scheduler`
  and `queue` already declare their own `command:`, so they should be unaffected — verify rather
  than assume.
- Why it matters: `entrypoint.sh` caches config at boot, and with the mount that writes
  `bootstrap/cache/config.php` into the *source tree*, baked with `DB_HOST=postgres`.

### Still open after that

- **Vite/HMR.** `npm run dev` on the WSL host is simplest — the browser resolves `localhost:5173`
  itself, so no Vite config change is needed. The catch: the mount shadows the image's built assets
  with the host's `public/build`, which is currently **empty**, so without either Vite running or a
  local `npm run build` you get `Unable to locate file in Vite manifest`.
- Delete `C:\Users\Rylef\Herd\financing-app` only after all of the above passes.

---

## Done and verified

| File | State |
|---|---|
| `Dockerfile` | 3 stages (`base` → `build` → `final`), Alpine/musl, 1.48 GB |
| `.dockerignore` | excludes `node_modules`, `vendor`, `.git`, `.env`, sqlite, `bootstrap/cache` |
| `docker/entrypoint.sh` | caches config/routes/views at boot, then `exec docker-php-entrypoint "$@"` |
| `compose.yaml` | `app` + `scheduler` + `queue` + `postgres`; `x-app` anchor, per-service `mem_limit`, `pgdata` volume |
| `.env.docker` | runtime config — **gitignored, holds the DB password** |
| `.env.docker.example` | committed template; the same keys with the three secrets blank |

Proven working locally:

- `GET /` → 200, `GET /up` → 200, Vite assets served
- Chromium renders a PDF as root (`--no-sandbox` + `font-liberation` both required)
- `php artisan schedule:list` runs through an overridden command — the three-role design works
- A job dispatched from `app` ran in the `queue` container — the two share nothing but Postgres, which is why `QUEUE_CONNECTION=database` is what makes the split work
- A pdf export peaks at 744 MiB in `app`; `1g` clears it with `memory.events` `max 0`
- Config caches at **container start** against the real environment (`APP_ENV=production` confirmed in `bootstrap/cache/config.php`)

## Next steps

### Docker work

Steps 1 and 2 are done and committed (`226daa4`, `a52ebf7`, `23891b3`).

1. ~~Add `scheduler` and `queue` services.~~ Done. Three containers off one image, split only
   by `command:`. Verified end to end: a job dispatched from `app` ran in the `queue` container,
   and `schedule:list` shows `payouts:open` due at 01:00 **UTC** — the containers run UTC, so
   confirm that is the hour you actually want before deploying.
2. ~~Deduplicate with YAML anchors.~~ Done as `x-app: &app`, holding `build`, `image`, `env_file`,
   `depends_on`, `restart`. `healthcheck` deliberately stayed *out* of the anchor: it differs in
   kind across the three roles, not just in value, and `<<` replaces whole keys rather than
   merging them. `mem_limit` added per service — `1g` / `256m` / `256m`, Postgres unbounded.
3. **Dev override** — *deferred, deliberately.* A `compose.override.yaml` that mounts source and
   skips config caching would help a second developer, and nobody else is on this yet. It is also
   bigger than it looks: `vite.config.ts` runs Inertia, the React compiler and Wayfinder, so a real
   edit-and-refresh loop needs the Vite dev server published and reachable from both the browser and
   the container, plus a guard around `entrypoint.sh`'s unconditional `config:cache`.
   Worth knowing what it is *not* for: an override makes the container **less** like production
   (mounted source, no config cache, dev deps, debug on). For reproducing a production bug, plain
   `compose.yaml` is already the better tool — it runs the same artifact Coolify will.
4. ~~`.env.docker.example`.~~ Done. `.env.docker` is gitignored, so without a template a fresh clone
   fails on a missing `env_file` before anything else. Doubles as the variable list for step 7.

### Deployment — AWS (not started, and not the current focus)

> **Target changed 2026-09-06 to AWS**, reversing the earlier VPS + Coolify plan. Everything below
> that named Coolify has been rewritten. Docker for prod and dev comes first.

**Decide this before any deployment work — it changes the shape of everything after:**

| If it's… | then `compose.yaml` is… |
|---|---|
| ECS / Fargate / App Runner | **local-only.** Images go to ECR; task definitions carry the real config, and the three roles become separate task definitions or services. |
| EC2 / Lightsail Containers | **production.** It runs roughly as-is on the instance. |

The Dockerfile is the same either way, which is why Docker work isn't blocked on this.

5. Push to a git remote. Nothing on AWS builds from a local folder.
6. Choose the service (table above), then provision. Region is still open — Singapore vs a US
   region depends on whether job applications target PH or US companies.
7. Decide **RDS vs a Postgres container.** AWS pulls hard toward RDS; RDS is also where the cost is.
8. Run `php artisan migrate --force` as a **pre-deployment/one-off task, never in the entrypoint** —
   three containers would race each other to migrate the same database at boot.
9. **Real SMTP before the first signup.** ⚠️ Everything except the landing page is behind
   `auth` + `verified`. With `MAIL_MAILER=log` you register, never get the email, and are locked out.
   (SES is the native answer here, and it starts in a sandbox that only sends to verified addresses.)
10. Postgres backups. A container volume is not a backup; neither is a single-AZ RDS instance you
    have never restored from.
11. Store `APP_KEY` outside the host — Secrets Manager or SSM Parameter Store. 2FA secrets and
    passkeys are encrypted with it: lose it and every user is permanently locked out of 2FA. The
    passkey domain is one-way too, since WebAuthn binds credentials to the hostname, so the
    production domain must be final before anyone enrolls one.
12. **Size the instance against the measured memory budget, not a guess.** `1g` + `256m` + `256m` is
    1.5 GB before Postgres or the OS. On Fargate that is a task-size line item you pay for monthly;
    moving the pdf render to a queued job would let the web task shrink.
13. **Build in CI, push to ECR.** On ECS this is mandatory rather than an optimization — there is no
    build-on-the-box option. `npm run build` is the memory-hungry step, so it wants a real runner.

## Commands worth remembering

```sh
docker compose up -d --build                  # rebuild and start
docker compose ps                             # status + health
docker compose logs app                       # LOG_CHANNEL=stderr puts errors here
docker compose config                         # print the fully-resolved file
docker compose exec app php artisan migrate --force
docker compose down                           # stop, KEEP the pgdata volume
docker compose down -v                        # stop and DELETE the database

docker compose run --rm --entrypoint php app artisan key:generate --show
```

`--entrypoint php` bypasses `entrypoint.sh`, which otherwise prints its cache output ahead of
whatever you were trying to capture.

## Traps already hit (don't re-learn these)

- **`node`/`npm` are not in a PHP image.** Grafted in from `node:22-alpine` — must match the base's
  libc. A Debian-built binary on Alpine fails as `node: not found`, which really means "wrong libc."
- **`COPY` failures are silent.** Docker only checks the source path exists. Wrong `--from` produces a
  broken image with a green build. Verify tools with a `RUN` after installing them.
- **Layer order is the caching rule.** Manifests → install → source. Anything below a changed layer
  re-runs, which is why `apk add chromium` sits above `COPY . .`.
- **`composer install` needs `--no-scripts --no-autoloader`** at that point — `post-autoload-dump`
  runs `artisan package:discover`, and `artisan` isn't copied in yet. `dump-autoload` after `COPY . .`
  fires the scripts once they can succeed.
- **`config:cache` must never run at build time.** It bakes resolved `env()` values into the image.
- **`ENTRYPOINT` wipes the inherited `CMD`** — that's why `compose.yaml`'s CMD line repeats the base
  image's own default.
- **`HEALTHCHECK` is inherited too, and not writing one is not the same as not having one.** The
  FrankenPHP base ships a check that curls Caddy's admin port 2019. `scheduler` and `queue` don't run
  Caddy, so they reported `unhealthy` forever until `healthcheck: disable: true` (Compose's
  `HEALTHCHECK NONE`). Same family as the `CMD` trap: `ENTRYPOINT`, `CMD`, `HEALTHCHECK`, `ENV` and
  `EXPOSE` all come down from the base.
- **The production image cannot run factories.** `composer install --no-dev` leaves out
  `fakerphp/faker`, and Laravel only declares its `fake()` helper when Faker is present — so
  `DemoUserSeeder` dies with `Call to undefined function fake()`. That is correct behavior, not a
  bug. To seed anyway, lend the container the host's vendor for one command:
  `docker compose run --rm -v "<abs path>\vendor:/app/vendor" app php artisan db:seed --class=DemoUserSeeder --force`.
  Works because Composer's autoloader resolves paths relative to itself. If this becomes routine,
  add a `dev` build target that installs *with* dev deps instead.
- **`docker stats` is too slow to catch a memory spike.** It samples about once a second and misses
  a brief peak entirely. The kernel keeps the real high-water mark at
  `/sys/fs/cgroup/memory.peak`, and `/sys/fs/cgroup/memory.events` counts ceiling hits as `max`.
  Reset with `echo 0 > /sys/fs/cgroup/memory.peak` before measuring. See `.ai/rules/general.md`.
- **A too-small `mem_limit` does not necessarily kill anything** — it makes the kernel reclaim page
  cache instead, so the symptom is a *slow* request and heavy block I/O, not a crash. Easy to
  misdiagnose as a slow query. `oom_kill 0` with a high `max` count is the fingerprint.
- **Shebang must be bytes 0–1 of the file**, and shell scripts need LF endings. `.gitattributes`
  already has `* text=auto eol=lf`, but `docker build` reads the working tree, not git.
- **`$` vs `$$` in compose healthchecks.** A single `$` is expanded by Compose against *your shell*;
  `$$` passes a literal `$` through to the container.
- **YAML lists:** `[a, b]` or `- a` on separate lines — never `- [a]`.

## Open question, parked

Chromium plus its dependency tree is **741 MB of the 1.48 GB image** — half the total. If size ever
becomes a real problem, the lever is not the base distro; it's whether Chromium lives in this image
at all, versus a separate browser service the app talks to over the network.
