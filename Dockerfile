FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
LABEL org.opencontainers.image.source="https://github.com/untraceablez/roadie" \
      org.opencontainers.image.description="Discord bot that posts upcoming live shows matching your server's genres" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
ENV NODE_ENV=production DATABASE_PATH=/data/roadie.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY migrations ./migrations
# /data is the only writable location. It is created owned by the unprivileged
# "node" user (uid 1000) so a fresh named volume is writable. To use another
# uid/gid (e.g. Unraid's 99:100), set `user:` in compose and make sure the
# mounted directory is writable by it.
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
CMD ["node", "dist/index.js"]
