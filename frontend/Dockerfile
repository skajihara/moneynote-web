FROM node:20-slim AS builder
WORKDIR /app

# Copy dependency files before source for better layer caching.
# npm ci is only re-run when package*.json changes, not on every source edit.
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
# Persist Next.js incremental compilation cache across builds via BuildKit cache mount
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
