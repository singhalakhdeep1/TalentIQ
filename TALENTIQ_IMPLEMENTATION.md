# TalentIQ - ML Platform Implementation

## Overview
This document describes the ML platform and observability technologies implementation added to TalentIQ.

## Technologies Added

### 1. Jaeger
- Distributed tracing
- OpenTelemetry integration

### 2. Tempo
- Grafana Tempo tracing
- OTLP exporter

### 3. Vault
- HashiCorp Vault secret management
- KV secrets engine

### 4. Consul
- Service discovery
- KV store
- Health checks

### 5. NATS
- Message streaming
- Request-reply pattern
- Queue groups

### 6. Argo Workflows
- Workflow orchestration
- Kubernetes-native workflows

### 7. MLflow
- Experiment tracking
- Metric logging
- Parameter logging

### 8. Weights & Biases
- Experiment tracking
- Model logging
- Artifact management

### 9. Kubeflow
- Pipeline orchestration
- ML training workflows

### 10. Ray
- Distributed computing
- Job submission
- Cluster management

### 11. Feast
- Feature store
- Online and historical features
- Feature ingestion

### 12. Evidently
- ML monitoring
- Data drift detection
- Performance metrics

### 13. Hugging Face
- Inference API
- Text generation
- Classification
- Embeddings

### 14. Pinecone
- Vector database
- Semantic search
- Vector operations

### 15. Weaviate
- Vector database
- GraphQL API
- Object storage

## Files Created

### Observability
- `services/ai/jaeger/tracer.ts` - Jaeger distributed tracing
- `services/ai/tempo/tracer.ts` - Tempo OTLP tracing

### Infrastructure
- `services/ai/vault/client.ts` - Vault secret management
- `services/ai/consul/client.ts` - Consul service discovery
- `services/ai/nats/client.ts` - NATS messaging

### Orchestration
- `services/ai/argo/workflows.ts` - Argo Workflows client
- `services/ai/kubeflow/client.ts` - Kubeflow Pipelines client

### ML Platform
- `services/ai/mlflow/client.ts` - MLflow tracking
- `services/ai/wandb/client.ts` - Weights & Biases client
- `services/ai/ray/client.ts` - Ray distributed computing
- `services/ai/feast/client.ts` - Feast feature store
- `services/ai/evidently/client.ts` - Evidently monitoring

### AI/ML
- `services/ai/huggingface/client.ts` - Hugging Face inference
- `services/ai/pinecone/client.ts` - Pinecone vector DB
- `services/ai/weaviate/client.ts` - Weaviate vector DB

## Features

### Jaeger
- Distributed tracing with spans
- Async operation tracing
- Const sampler configuration

### Tempo
- OpenTelemetry integration
- OTLP gRPC exporter
- Resource attributes

### Vault
- Secret CRUD operations
- KV secrets engine
- Secret listing

### Consul
- Service registration/deregistration
- Health checks
- KV store operations

### NATS
- Publish/subscribe messaging
- Request-reply pattern
- Queue groups for load balancing

### Argo Workflows
- Workflow submission
- Workflow status tracking
- Retry and delete operations

### MLflow
- Experiment creation
- Run management
- Metric and parameter logging

### Weights & Biases
- Run initialization
- Metric logging
- Artifact management
- Model saving

### Kubeflow
- Pipeline run creation
- Run status tracking
- Run termination

### Ray
- Job submission
- Status monitoring
- Job cancellation

### Feast
- Online feature retrieval
- Historical features
- Feature ingestion

### Evidently
- Data drift detection
- Performance metrics
- Report generation

### Hugging Face
- Text generation
- Text classification
- Named entity recognition
- Embedding generation

### Pinecone
- Vector upsert and query
- Metadata filtering
- Index management

### Weaviate
- Class creation
- Object CRUD
- Semantic search

## Installation Required

Add to root package.json:
```json
{
  "dependencies": {
    "jaeger-client": "^6.18.1",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-trace-node": "^1.25.1",
    "@opentelemetry/exporter-trace-otlp-grpc": "^0.52.1",
    "@opentelemetry/resources": "^1.25.1",
    "@opentelemetry/semantic-conventions": "^1.25.1",
    "node-vault": "^0.10.3",
    "consul": "^1.2.0",
    "nats": "^2.28.0",
    "axios": "^1.7.9",
    "@wandb/sdk": "^0.5.0",
    "weaviate-ts-client": "^2.5.0",
    "@pinecone-database/pinecone": "^5.1.0",
    "@huggingface/inference": "^2.8.0"
  }
}
```

Run:
```bash
pnpm install
```

## Notes
- All code is written but packages are not installed (per user request)
- TypeScript errors are expected until packages are installed
- Requires running instances of external services (Jaeger, Tempo, Vault, Consul, NATS, Argo, Kubeflow, Ray, Feast, Evidently)
- Pinecone and Weaviate require API keys and index setup
- Hugging Face requires API key
