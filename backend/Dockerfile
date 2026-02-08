FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lockb* ./
COPY prisma ./prisma

RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate --config prisma/prisma.config.ts

FROM oven/bun:1-slim

WORKDIR /app

COPY --from=builder /app /app

ENV NODE_ENV=production

EXPOSE 3700

CMD ["bun", "index.ts"]
