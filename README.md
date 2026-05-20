# TalentIQ

Enterprise recruitment platform with event-driven candidate workflows, AI-assisted screening, voice interviews, and analytics.

## Monorepo Structure

- `apps/api`: NestJS API (CQRS, event store, auth, jobs, candidates, interviews, analytics, skills graph, credentials, health, metrics)
- `apps/bff-web`: NestJS BFF aggregation layer for dashboard clients
- `apps/web`: Next.js dashboard app
- `packages/database`: Prisma schema and migration scripts
- `packages/shared`: shared Zod schemas and event types
- `services/ai`: FastAPI AI microservice (resume parsing, embeddings, screening graph, whisper)
- `infra/k8s`, `infra/helm`, `infra/terraform`: deployment scaffolding

## Local Ports

- API: `4000`
- BFF: `4001`
- Web: `3000`
- AI service: `8000`
- Postgres: `5432`
- Redis: `6379`
- Neo4j: `7474`, `7687`
- ClickHouse: `8123`, `9000`
- MinIO API/Console: `9002`, `9003`
- Kafka: `9092`

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker + Docker Compose

## Quick Start

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Docker Start

```bash
docker compose up --build
```

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm --filter @talentiq/api test
pnpm --filter @talentiq/api test:e2e
pnpm db:generate
pnpm db:migrate
```

## Environment Templates

- Root: `.env.example`
- API: `apps/api/.env.example`
- BFF: `apps/bff-web/.env.example`
- Web: `apps/web/.env.local.example`

## Notes

- Database and ClickHouse init scripts are mounted by `docker-compose.yml` from `infra/sql/init.sql` and `infra/clickhouse/init.sql`.
- AI service dependencies are in `services/ai/requirements.txt`.
