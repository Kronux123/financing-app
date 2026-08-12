---
paths:
  - 'Dockerfile,compose.yaml,docker/**'
---

# General

## Container build order and topology for production images
The frontend build stage needs PHP, not just Node: vite.config.ts runs the Wayfinder plugin, which shells out to `php artisan wayfinder:generate` during `npm run build`. Build from a PHP image with Node grafted in, run `composer install` first, and `cp .env.example .env` so artisan can boot.

Run `config:cache` in the entrypoint, never in the Dockerfile — it bakes env vars in at the moment it runs, so caching at build time freezes `.env.example` values (blank APP_KEY, MAIL_MAILER=log) into the image.

Keep `migrate` out of the entrypoint. The app, scheduler, and queue containers boot from the same image and would race each other; migrations belong in the platform's single pre-deployment step.

Three containers, one image: `app` (FrankenPHP over public/), `scheduler` (`php artisan schedule:work` — foreground, no host cron), `queue` (`php artisan queue:work`). Set `mem_limit` on each and `LOG_CHANNEL=stderr` so logs stream to the platform. Health check is `/up`, already wired in bootstrap/app.php.
