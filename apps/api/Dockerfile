FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci

COPY . .

RUN npm run prisma:generate -w @bac-bank/api
RUN npm run build -w @bac-bank/api

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["sh", "-c", "npm run prisma:migrate:deploy -w @bac-bank/api && npm run prisma:seed -w @bac-bank/api && node apps/api/dist/apps/api/src/main.js"]
