# Docker setup — where we left off

Last worked on: 2026-09-04. Hand-written for learning, not generated — keep it that way.

## Done and verified

| File | State |
|---|---|
| `Dockerfile` | 3 stages (`base` → `build` → `final`), Alpine/musl, 1.48 GB |
| `.dockerignore` | excludes `node_modules`, `vendor`, `.git`, `.env`, sqlite, `bootstrap/cache` |
| `docker/entrypoint.sh` | caches config/routes/views at boot, then `exec docker-php-entrypoint "$@"` |
| `compose.yaml` | `app` + `postgres`, healthchecks, `pgdata` volume |
| `.env.docker` | runtime config — **gitignored, holds the DB password** |

Proven working locally:

- `GET /` → 200, `GET /up` → 200, Vite assets served
- Chromium renders a PDF as root (`--no-sandbox` + `font-liberation` both required)
- `php artisan schedule:list` runs through an overridden command — the three-role design works
- Config caches at **container start** against the real environment (`APP_ENV=production` confirmed in `bootstrap/cache/config.php`)

## Next steps

### Docker work (~40 min)

1. **Add `scheduler` and `queue` services** to `compose.yaml` — same `image: kept:local`, different `command:`
   (`php artisan schedule:work`, `php artisan queue:work`). ~8 lines.
2. **Deduplicate with YAML anchors** — three services will share `image`/`env_file`/`depends_on`/`restart`.
   Define once as `x-app: &app`, merge with `<<: *app`. Add `mem_limit` per service while in there.
3. **Dev override** (optional) — `compose.override.yaml` that mounts source and skips config caching,
   for an edit-and-refresh loop. Skippable: Herd already covers local development.

### Deployment (an afternoon, mostly not Docker)

4. Commit, push to a git remote — Coolify deploys from a repo.
5. Provision the VPS, install Coolify (Singapore box, ~$15/mo).
6. Configure in Coolify: env vars, domain, TLS, and `php artisan migrate --force` as the
   **pre-deployment command** — deliberately not in the entrypoint, or three containers race each other.
7. **Real SMTP before the first signup.** ⚠️ Everything except the landing page is behind
   `auth` + `verified`. With `MAIL_MAILER=log` you register, never get the email, and are locked out.
8. Postgres backups. A volume on one VPS is not a backup.
9. Store `APP_KEY` outside the host. 2FA secrets and passkeys are encrypted with it — lose it and
   every user is permanently locked out of 2FA. The passkey domain is also one-way: WebAuthn binds
   credentials to the hostname, so the production subdomain must be final before anyone enrolls one.

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
- **Shebang must be bytes 0–1 of the file**, and shell scripts need LF endings. `.gitattributes`
  already has `* text=auto eol=lf`, but `docker build` reads the working tree, not git.
- **`$` vs `$$` in compose healthchecks.** A single `$` is expanded by Compose against *your shell*;
  `$$` passes a literal `$` through to the container.
- **YAML lists:** `[a, b]` or `- a` on separate lines — never `- [a]`.

## Open question, parked

Chromium plus its dependency tree is **741 MB of the 1.48 GB image** — half the total. If size ever
becomes a real problem, the lever is not the base distro; it's whether Chromium lives in this image
at all, versus a separate browser service the app talks to over the network.
