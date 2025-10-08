FROM debian:13-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install -y chromium \
  && rm -rf /var/lib/apt/lists/*
COPY --from=oven/bun:1.2 /usr/local/bin/bun /usr/local/bin/bun

RUN groupadd -g 1000 user \
  && useradd -r -u 1000 -g user user \
  && chown -R user:user /app

USER user

FROM base AS build
COPY --chown=user:user package.json bun.lock tsconfig.json ./
RUN bun install --production

FROM base AS prod
COPY --chown=user:user --from=build /app /app
COPY --chown=user:user src ./
ENTRYPOINT [ "bun", "start"]
