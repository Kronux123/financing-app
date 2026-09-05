# First Version of DockerFile

FROM dunglas/frankenphp:1-php8.4-alpine AS base

# Points to the directory where the application code will be copied
WORKDIR /app

# Installing extensions
RUN install-php-extensions gd zip sockets pdo_pgsql intl pcntl


# Stage 2
FROM base AS build

COPY --from=composer/composer:2-bin /composer /usr/local/bin/composer
COPY --from=node:22-alpine /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-alpine /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm


COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-progress --no-interaction --no-autoloader

COPY package.json package-lock.json ./
RUN npm ci


COPY . .

RUN cp .env.example .env
RUN composer dump-autoload --optimize
RUN npm run build


# Stage 3
FROM base AS final

RUN apk add --no-cache chromium fontconfig font-liberation

ENV LARAVEL_PDF_CHROME_BINARY=/usr/bin/chromium
ENV LARAVEL_PDF_CHROME_NO_SANDBOX=true

COPY . .

COPY --from=build /app/vendor /app/vendor
COPY --from=build /app/public/build /app/public/build

ENV SERVER_NAME=:80
EXPOSE 80

COPY --chmod=0775 docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
CMD ["--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]