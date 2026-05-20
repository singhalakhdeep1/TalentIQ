FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --filter @talentiq/api... --frozen-lockfile=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm --filter @talentiq/api build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/main.js"]
