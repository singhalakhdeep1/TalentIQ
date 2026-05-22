# TalentIQ

<div align="center">

**Next-Generation Enterprise Recruitment Platform**

Event-driven architecture with AI-powered screening, real-time analytics, and intelligent candidate matching.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-green.svg)](https://fastapi.tiangolo.com/)

</div>

---

## 📋 Overview

TalentIQ is a modern, enterprise-grade recruitment platform that combines event-driven architecture, AI-powered candidate screening, and real-time analytics. Built with microservices and CQRS patterns, it provides scalable, intelligent hiring workflows for organizations of any size.

### 🌟 Key Features

- **🤖 AI-Powered Screening**: Resume parsing, semantic search, and intelligent candidate ranking
- **🎤 Voice Interviews**: Automated voice screening with Whisper transcription
- **📊 Real-time Analytics**: Event-driven insights with ClickHouse OLAP
- **🕸️ Skills Graph**: Neo4j-powered relationship mapping and candidate matching
- **🔐 Enterprise Auth**: JWT-based authentication with role-based access control
- **📧 Event-Driven Workflows**: Kafka-based event streaming and CQRS architecture
- **💾 Object Storage**: MinIO for resume and document management
- **🔍 Vector Search**: pgvector for semantic resume search
- **📈 Performance Metrics**: OpenTelemetry instrumentation and distributed tracing
- **🚀 Scalable Infrastructure**: Kubernetes-ready with Helm charts and Terraform

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Web Dashboard                          │
│                       (Next.js Frontend)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                       BFF Aggregation Layer                      │
│                          (NestJS BFF)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                          Core API                               │
│                 (NestJS CQRS + Event Sourcing)                  │
│  • Authentication      • Jobs Module                            │
│  • Candidates          • Interviews                             │
│  • Analytics           • Skills Graph                           │
│  • Credentials         • Health Checks                          │
└─────┬──────────┬──────────┬────────┬──────────┬────────────────┘
      │          │          │        │          │
  ┌───▼───┐  ┌──▼──┐  ┌────▼────┐ ┌▼────┐ ┌───▼────┐
  │Postgres│ │Redis│  │ Kafka   │ │Neo4j│ │ClickHouse│
  │pgvector│ │Cache│  │ Events  │ │Graph│ │Analytics │
  └────────┘ └─────┘  └─────────┘ └─────┘ └──────────┘
                             │
                       ┌─────▼─────┐
                       │  AI Service │
                       │  (FastAPI)  │
                       │ • Resume Parser│
                       │ • Embeddings   │
                       │ • Whisper STT  │
                       │ • Screening    │
                       └────────────────┘
```

---

## 📁 Monorepo Structure

```
talentiq/
├── apps/
│   ├── api/                     # Core NestJS API
│   │   ├── src/
│   │   │   ├── auth/           # Authentication & authorization
│   │   │   ├── jobs/           # Job postings management
│   │   │   ├── candidates/     # Candidate profiles
│   │   │   ├── interviews/     # Interview scheduling
│   │   │   ├── analytics/      # ClickHouse analytics
│   │   │   ├── skills-graph/   # Neo4j skills mapping
│   │   │   ├── credentials/    # Credential verification
│   │   │   └── health/         # Health checks & metrics
│   │   └── test/               # E2E tests
│   │
│   ├── bff-web/                # Backend-for-Frontend
│   │   └── src/                # Dashboard aggregation layer
│   │
│   └── web/                    # Next.js Dashboard
│       └── app/                # App router pages
│
├── packages/
│   ├── database/               # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── migrations/
│   │
│   └── shared/                 # Shared types & schemas
│       ├── schemas/            # Zod validation schemas
│       └── events/             # Event type definitions
│
├── services/
│   └── ai/                     # FastAPI AI Microservice
│       ├── main.py
│       ├── resume_parser.py    # Document intelligence
│       ├── embeddings.py       # Vector embeddings
│       ├── screening.py        # AI screening logic
│       └── whisper.py          # Voice transcription
│
├── infra/
│   ├── k8s/                    # Kubernetes manifests
│   ├── helm/                   # Helm charts
│   ├── terraform/              # Infrastructure as Code
│   ├── sql/                    # Database init scripts
│   └── clickhouse/             # Analytics init scripts
│
├── docker-compose.yml          # Local development stack
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml         # Workspace definition
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and **pnpm** 9+
- **Python** 3.12+
- **Docker** & **Docker Compose**
- **PostgreSQL** 16+ (with pgvector)

### Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd talentiq
   cp .env.example .env
   pnpm install
   ```

2. **Configure Environment**
   
   Edit `.env` and configure services:
   ```env
   DATABASE_URL=postgresql://talentiq:talentiq_secret@localhost:5432/talentiq
   REDIS_URL=redis://localhost:6379
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=talentiq_neo4j
   CLICKHOUSE_HOST=localhost:8123
   KAFKA_BROKERS=localhost:9092
   MINIO_ENDPOINT=localhost:9002
   JWT_SECRET=your-secret-key
   OPENAI_API_KEY=your-openai-key
   ```

3. **Generate Database Schema**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. **Start Development**
   ```bash
   pnpm dev
   ```

   This starts:
   - API: http://localhost:4000
   - BFF: http://localhost:4001
   - Web: http://localhost:3000
   - AI Service: http://localhost:8000

---

## 🐳 Docker Deployment

Run the complete stack with a single command:

```bash
docker compose up --build
```

**Infrastructure Services:**

| Service | Port(s) | Description |
|---------|---------|-------------|
| **PostgreSQL** | 5432 | Primary database with pgvector |
| **Redis** | 6379 | Cache and session store |
| **Neo4j** | 7474, 7687 | Skills graph database |
| **ClickHouse** | 8123, 9000 | Analytics OLAP database |
| **MinIO** | 9002, 9003 | Object storage (API + Console) |
| **Kafka** | 9092 | Event streaming |

**Application Services:**

| Service | Port | Description |
|---------|------|-------------|
| **API** | 4000 | Core NestJS API |
| **BFF** | 4001 | Frontend aggregation layer |
| **Web** | 3000 | Next.js dashboard |
| **AI Service** | 8000 | FastAPI ML service |

---

## 🛠️ Development Commands

```bash
# Start all services in development mode
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run API tests only
pnpm --filter @talentiq/api test

# Run E2E tests
pnpm --filter @talentiq/api test:e2e

# Database operations
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Run migrations
pnpm db:seed           # Seed test data
pnpm db:studio         # Open Prisma Studio

# Code quality
pnpm lint              # Lint all packages
pnpm typecheck         # Type check all packages
```

---

## 📡 API Documentation

### Core API Endpoints

#### Authentication
```http
POST /auth/register          # User registration
POST /auth/login             # User login
POST /auth/refresh           # Refresh access token
GET  /auth/profile           # Get user profile
```

#### Jobs
```http
GET    /jobs                 # List all jobs
POST   /jobs                 # Create job posting
GET    /jobs/:id             # Get job details
PATCH  /jobs/:id             # Update job
DELETE /jobs/:id             # Delete job
POST   /jobs/:id/publish     # Publish job
```

#### Candidates
```http
GET    /candidates           # List candidates
POST   /candidates           # Create candidate
GET    /candidates/:id       # Get candidate details
PATCH  /candidates/:id       # Update candidate
POST   /candidates/search    # Semantic search
GET    /candidates/:id/matches # Get job matches
```

#### Interviews
```http
GET    /interviews           # List interviews
POST   /interviews           # Schedule interview
PATCH  /interviews/:id       # Update interview
POST   /interviews/:id/voice # Upload voice recording
GET    /interviews/:id/transcript # Get transcription
```

#### Analytics
```http
GET    /analytics/overview   # Dashboard metrics
GET    /analytics/jobs/:id   # Job-specific analytics
GET    /analytics/pipeline   # Hiring pipeline stats
POST   /analytics/query      # Custom ClickHouse query
```

#### Skills Graph
```http
GET    /skills               # List all skills
POST   /skills/relate        # Create skill relationship
GET    /skills/:id/similar   # Find similar skills
GET    /skills/path          # Shortest path between skills
```

---

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm --filter @talentiq/api test:e2e

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

---

## 🔧 Configuration

### Environment Files

- **Root**: `.env.example` - Shared environment variables
- **API**: `apps/api/.env.example` - API-specific config
- **BFF**: `apps/bff-web/.env.example` - BFF config
- **Web**: `apps/web/.env.local.example` - Frontend config

### Database Initialization

SQL scripts in `infra/sql/init.sql` and `infra/clickhouse/init.sql` are automatically executed when containers start.

### AI Service Configuration

Python dependencies are managed in `services/ai/requirements.txt`:
- FastAPI
- OpenAI SDK
- Whisper (OpenAI)
- Langchain
- Sentence Transformers

---

## 📦 Tech Stack

### Backend
- **NestJS**: API framework with CQRS pattern
- **Prisma**: Type-safe database ORM
- **FastAPI**: AI service framework (Python)
- **BullMQ**: Job queues with Redis
- **KafkaJS**: Event streaming
- **Passport**: Authentication strategies

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **shadcn/ui**: Component library

### Databases
- **PostgreSQL**: Primary database with pgvector extension
- **Redis**: Caching and pub/sub
- **Neo4j**: Graph database for skills relationships
- **ClickHouse**: OLAP for analytics

### Storage & Messaging
- **MinIO**: S3-compatible object storage
- **Kafka**: Event streaming platform

### Observability
- **OpenTelemetry**: Distributed tracing
- **Prometheus**: Metrics collection
- **Grafana**: Visualization (configured in infra)

### DevOps
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **Helm**: Package manager
- **Terraform**: Infrastructure as Code
- **Turborepo**: Monorepo build system

---

## 🚢 Deployment

### Production Build

```bash
pnpm build
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f infra/k8s/

# Or use Helm
helm install talentiq infra/helm/talentiq
```

### Terraform Infrastructure

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

---

## 📊 Performance Features

- **Event Sourcing**: Complete audit trail and replay capability
- **CQRS**: Optimized read and write models
- **Vector Search**: Fast semantic candidate matching
- **Graph Queries**: Neo4j for complex relationship queries
- **Real-time Analytics**: ClickHouse for sub-second queries
- **Horizontal Scaling**: Stateless API design
- **Caching Strategy**: Multi-layer Redis caching

---

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control**: Granular permissions
- **Rate Limiting**: Throttling with NestJS Throttler
- **Helmet**: Security headers
- **Input Validation**: class-validator and Zod schemas
- **Password Hashing**: Argon2 for secure password storage
- **API Documentation**: Swagger/OpenAPI with authentication

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Ensure tests pass (`pnpm test`)
4. Submit a pull request

---

## 📄 License

[Add your license here]

---

## 🙋 Support

- **Issues**: GitHub Issues
- **Documentation**: See individual package READMEs
- **API Docs**: http://localhost:4000/api (Swagger UI)

---

<div align="center">
Built with 🚀 using modern microservices architecture
</div>
