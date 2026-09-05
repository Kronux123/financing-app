---
paths:
  - 'Dockerfile,compose.yaml,docker/**'
  - 'compose.yaml,Dockerfile,docker/**'
---

# General

## Container build order and topology for production images
The frontend build stage needs PHP, not just Node: vite.config.ts runs the Wayfinder plugin, which shells out to `php artisan wayfinder:generate` during `npm run build`. Build from a PHP image with Node grafted in, run `composer install` first, and `cp .env.example .env` so artisan can boot.

Run `config:cache` in the entrypoint, never in the Dockerfile — it bakes env vars in at the moment it runs, so caching at build time freezes `.env.example` values (blank APP_KEY, MAIL_MAILER=log) into the image.

Keep `migrate` out of the entrypoint. The app, scheduler, and queue containers boot from the same image and would race each other; migrations belong in the platform's single pre-deployment step.

Three containers, one image: `app` (FrankenPHP over public/), `scheduler` (`php artisan schedule:work` — foreground, no host cron), `queue` (`php artisan queue:work`). Set `mem_limit` on each and `LOG_CHANNEL=stderr` so logs stream to the platform. Health check is `/up`, already wired in bootstrap/app.php.

## The web container needs 1g because chromium renders PDFs in-request
`MonthExportController::monthPdf()` renders through Spatie's pdf driver, which spawns chromium inside the HTTP request — nothing in the app implements `ShouldQueue`, so the spike lands on the web container, not the worker.

Measured: a single export peaks at **744 MiB**. Do not set `app`'s `mem_limit` below `1g`. At 512m the cgroup hit its ceiling 3,111 times (`memory.events` `max`) and the kernel thrashed page cache to survive — 875 MB of block I/O for one render, versus 428 MB at 1g. It never OOM-killed, so the symptom is a slow export, not a crash: easy to misread as a slow query.

To re-measure: `echo 0 > /sys/fs/cgroup/memory.peak` in the container, run an export, then read `memory.peak` and `memory.events`. `max 0` means the limit was never hit. `docker stats` samples too slowly to catch the spike.

Two concurrent exports would want ~1.5 GB, which nothing currently prevents. Moving the render to a queued job is the real fix — it also moves chromium's 741 MB off the web image.
