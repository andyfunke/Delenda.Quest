FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN node_modules/.bin/esbuild packages/ssh-gateway/src/authorized-keys.ts --bundle --platform=node --format=esm --target=node22 --outfile=packages/ssh-gateway/dist/authorized-keys.mjs \
 && node_modules/.bin/esbuild packages/ssh-gateway/src/session.ts --bundle --platform=node --format=esm --target=node22 --outfile=packages/ssh-gateway/dist/session.mjs

FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system delenda \
 && useradd --system --gid delenda --home-dir /nonexistent --shell /usr/sbin/nologin delenda-auth \
 && useradd --create-home --gid delenda --shell /bin/sh play \
 && echo 'play:password-authentication-is-disabled' | chpasswd
WORKDIR /app
COPY --from=build /app/packages/ssh-gateway/dist /app/packages/ssh-gateway/dist
COPY packages/ssh-gateway/sshd_config /etc/ssh/sshd_config
COPY packages/ssh-gateway/entrypoint.sh /usr/local/bin/delenda-ssh-entrypoint
RUN chmod 0755 /usr/local/bin/delenda-ssh-entrypoint \
 && chmod 0755 /app/packages/ssh-gateway/dist/*.mjs
EXPOSE 2222/tcp
ENTRYPOINT ["/usr/local/bin/delenda-ssh-entrypoint"]
