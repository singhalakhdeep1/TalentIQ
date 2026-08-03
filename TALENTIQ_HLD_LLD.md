# TalentIQ - HLD/LLD Implementation

## Overview
This document provides comprehensive documentation for HLD/LLD patterns implemented in the TalentIQ talent management platform application (TypeScript/Node.js).

## Implemented Topics

### LLD Topics (Low-Level Design)

#### 1. Distributed Caching
**Location:** `packages/shared/src/services/cache/cache.service.ts`

**Description:** Implements distributed caching with Redis for talent management data.

**Key Features:**
- Get/set/delete operations
- TTL support
- Get or set pattern
- Pattern-based invalidation

**Usage Example:**
```typescript
import { CacheService } from './packages/shared/src/services/cache/cache.service';

const cache = new CacheService();
const cached = await cache.get('candidate:123');
await cache.set('candidate:123', JSON.stringify(candidate), 3600);
```

#### 2. API Rate Limiting
**Location:** `packages/shared/src/services/rate-limiting/rate-limiting.service.ts`

**Description:** Implements token bucket algorithm for API rate limiting.

**Key Features:**
- Token bucket algorithm
- Per-key rate limiting
- Configurable bucket capacity
- Redis-backed storage

**Usage Example:**
```typescript
import { RateLimitingService } from './packages/shared/src/services/rate-limiting/rate-limiting.service';

const rateLimiting = new RateLimitingService();
const allowed = await rateLimiting.isAllowed(`user:${userId}`, 1);
```

#### 3. Structured Logging
**Location:** `packages/shared/src/services/structured-logging/structured-logging.service.ts`

**Description:** Implements structured logging with correlation IDs and context.

**Key Features:**
- Structured log entries
- Correlation ID tracking
- User context tracking
- Audit event logging

**Usage Example:**
```typescript
import { StructuredLoggingService } from './packages/shared/src/services/structured-logging/structured-logging.service';

const logging = new StructuredLoggingService();
logging.logAuditEvent('CandidateViewed', 'Recruiter viewed candidate profile', { userId, candidateId });
```

### HLD Topics (High-Level Design)

#### 1. Database Layer
**Location:** `packages/database/` (Already exists)

**Description:** Database abstraction layer with Prisma for talent data management.

#### 2. Shared Schemas
**Location:** `packages/shared/src/schemas/` (Already exists)

**Description:** Shared validation schemas for data consistency across services.

#### 3. Shared Types
**Location:** `packages/shared/src/types/` (Already exists)

**Description:** Shared TypeScript types for type safety across the monorepo.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Monorepo Structure                        │
│  (Turborepo, pnpm workspaces)                               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Apps       │  │  Services    │  │   Shared     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  (Candidates, Companies, Jobs, Assessments, Analytics)       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Cache     │  │Rate Limiting │  │ Structured   │      │
│  │   (Redis)    │  │  Service     │  │   Logging    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Database   │  │   Schemas    │  │    Types     │      │
│  │  (Prisma)    │  │  (Zod/Valib) │  │  (TypeScript)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

Environment variables:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_BUCKET_CAPACITY=100
RATE_LIMIT_REFILL_RATE=1

# Database
DATABASE_URL=postgresql://localhost/talentiq
```

## Summary

This implementation provides TalentIQ-specific HLD/LLD patterns focusing on distributed caching, rate limiting, and structured logging. The platform already includes extensive infrastructure with a monorepo structure (Turborepo), database layer (Prisma), shared schemas (validation), and shared types (TypeScript), making it a comprehensive talent management platform with modern development practices.

## Tech Stack Coverage Summary

Comprehensive HLD/LLD implementation across major tech stacks:

1. ✅ **bankcore-dotnet** (.NET/C#) - All 15 topics
2. ✅ **ferrobank** (Rust) - All 15 topics
3. ✅ **finrails** (Ruby on Rails) - All 15 topics
4. ✅ **finvault-go** (Go) - All 15 topics
5. ✅ **springbank** (Java/Spring Boot) - All 15 topics
6. ✅ **ecommerce-platform** (Node.js) - All 15 topics
7. ✅ **cartwave** (Python/Django) - All 15 topics
8. ✅ **microservices-architecture** (K8s) - Microservices-specific patterns
9. ✅ **trove** (NestJS/TypeScript) - Marketplace-specific patterns
10. ✅ **stratum** (NestJS/TypeScript) - Platform-specific patterns
11. ✅ **node-microservices** (Node.js) - Microservices-specific patterns
12. ✅ **ResilienceForge** (DevOps/K8s) - DevOps-specific patterns
13. ✅ **production-node-api** (Node.js) - Production-specific patterns
14. ✅ **dispatch** (TypeScript/Node.js) - Dispatch-specific patterns
15. ✅ **recruitment-api** (TypeScript/Node.js) - Recruitment-specific patterns
16. ✅ **social-network-api** (TypeScript/Node.js) - Social network-specific patterns
17. ✅ **CodeBridge** (Next.js/TypeScript) - Collaborative coding-specific patterns
18. ✅ **TalentIQ** (TypeScript/Node.js) - Talent management-specific patterns

The remaining 37+ projects will receive relevant patterns based on their specific domain and requirements, following the Option 2 strategy for comprehensive tech stack coverage without redundant work.
