#!/bin/sh
set -e

# These run at container start, not at build time: config:cache evaluates every
# env() call and writes the resulting values into bootstrap/cache/config.php.
# Run it during the build and .env.example's blank APP_KEY and MAIL_MAILER=log
# would be frozen into the image, overriding the real environment forever.
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Hand off to whatever command this container was given — the web server by
# default, or queue:work / schedule:work for the other two roles.
exec docker-php-entrypoint "$@"