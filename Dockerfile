# Hazel Glen Care API — Debian slim (Prisma-friendly, no Alpine/openssl flakiness)
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

FROM base AS build
COPY package.json package-lock.json* ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY . .
EXPOSE 4000
# `db push` syncs the schema to the database on start (creates tables if missing),
# which avoids needing committed migration files for first-run. Swap to
# `prisma migrate deploy` once you generate migrations with `prisma migrate dev`.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/server.js"]
EXPOSE 10000
