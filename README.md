# Hotel Offer Orchestrator

A production-grade hotel offer aggregator and orchestrator built with **Node.js (TypeScript)**, **Express**, **Temporal.io**, **Redis**, and **Docker Compose**.

The system calls two upstream mock supplier APIs in parallel, deduplicates hotel listings by name, selects the lowest price per hotel, caches the canonical records in Redis, and executes fast price-range filtering natively inside Redis using Sorted Sets (`ZSET`).

---

## Tech Stack

- **Language & Runtime**: Node.js 22 LTS, TypeScript (Strict ES2022 / NodeNext)
- **Web Framework**: Express.js
- **Orchestration Engine**: Temporal.io (`@temporalio/client`, `@temporalio/workflow`, `@temporalio/activity`, `@temporalio/worker`)
- **In-Memory Cache & Filter**: Redis 7 (`ioredis`)
- **Validation & Tooling**: Zod, Pino (Structured Logging), Swagger UI
- **DevOps**: Docker, Docker Compose (Multi-stage build)

---

## Architecture & SOLID / MVC Design

```
Client (Browser / Postman)
      │
      ▼
Express API Gateway (:3000)
├── GET /api/hotels?city=delhi&minPrice=...&maxPrice=...
├── GET /health (Bonus: Multi-dependency check)
├── GET /api-docs (Interactive Swagger UI)
└── GET /supplier[A|B]/hotels (Mock upstream suppliers)
      │
      ▼
Temporal.io Cluster (:7233) & Worker
├── Activity: Fetch Supplier A (Parallel)
├── Activity: Fetch Supplier B (Parallel)
├── Workflow: Deterministic Deduplication & Lowest-Price Selection
└── Activity: Persist to Redis (ZSET & Hash)
      │
      ▼
Redis 7 (:6379)
├── hotels:zset:{city} (Score: Price, Member: Hotel Name)
└── hotels:data:{city} (Field: Hotel Name, Value: JSON Offer)
```

- **Single Responsibility (SRP)**: Controllers handle HTTP translation; Temporal workflows handle pure comparison; Activities handle network I/O; Redis service handles persistence.
- **Open/Closed (OCP) & Liskov Substitution (LSP)**: Supplier clients adhere to a unified interface (`IHotelSupplierClient`), allowing new suppliers to be plugged in without modifying core deduplication logic.
- **Redis In-Storage Price Filtering**: Executes `ZRANGEBYSCORE hotels:zset:{city} minPrice maxPrice` directly in Redis ($O(\log N + M)$), followed by `HMGET` for instant payload hydration.
- **Supplier Resilience**: If one supplier is down after retries, the workflow gracefully falls back to the healthy supplier's inventory.

---

## Quickstart (One-Click Automated Script)

To automatically start the entire project:

```bash
./start.sh
```

The script will automatically detect Docker and launch all 5 services via `docker compose up --build`. If Docker Desktop is closed, it will launch it on macOS or seamlessly fall back to local Node.js mode.

---

## Alternative: Run with Docker Compose Directly

Run the entire cluster (API, Temporal Worker, Temporal Server, Temporal Web UI, Redis) with:

```bash
docker compose up --build
```

### Services Started:
- **API Server & Web UI**: [http://localhost:3000](http://localhost:3000)
- **Interactive Swagger Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Temporal Web Dashboard**: [http://localhost:8233](http://localhost:8233)
- **Redis Server**: `localhost:6379`
- **Temporal Server (gRPC)**: `localhost:7233`

---

## Local Development (Without Docker)

### 1. Prerequisites
- Node.js >= 20
- Redis running on `localhost:6379` (optional for pure mock testing)
- Temporal Server running on `localhost:7233` (optional; service includes an automatic fallback for standalone mode)

### 2. Setup
```bash
# Clone the repository and install dependencies
npm install

# Build the TypeScript project
npm run build

# Start the API server
npm run dev

# (Optional) In another terminal, start the Temporal Worker
npm run dev:worker
```

---

## Deploying to Vercel via Docker Container

Vercel supports deploying standalone Docker apps directly using their container runtime.

### 1. Pre-configured Files
- [`vercel.json`](./vercel.json): Configured with `"framework": "container"`.
- [`Dockerfile`](./Dockerfile): Multi-stage Node.js build optimized for Vercel's Container Registry (VCR).
- [`.vercelignore`](./.vercelignore): Ensures only clean source code is sent to Vercel.

### 2. Deploy with Vercel CLI
```bash
# Preview Deployment
vercel

# Production Deployment
vercel --prod
```

### 3. Serverless Datastores on Vercel
Because containers scale down to zero on Vercel:
- **Redis**: Connect free [Upstash Redis](https://upstash.com) via `vercel env add REDIS_URL` (or rely on the app's automatic in-memory fallback).
- **Temporal**: Connect to [Temporal Cloud](https://temporal.io/cloud) by setting `TEMPORAL_ADDRESS` (or rely on the app's in-process deduplication fallback).

---

## API Endpoints & Examples

### 1. Retrieve Deduplicated Hotel Offers
```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```
**Sample Response:**
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  },
  {
    "name": "Marriott",
    "price": 7500,
    "supplier": "Supplier B",
    "commissionPct": 18
  }
]
```

### 2. Price Range Filtering (Executed inside Redis)
```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5400&maxPrice=6000"
```
Returns only hotels within `[5400, 6000]` (e.g., `"Radison"` at $5900, filtering out `"Holtin"` at $5340).

### 3. Dependency Health Check (Bonus Point)
```bash
curl "http://localhost:3000/health"
```
**Sample Response:**
```json
{
  "status": "UP",
  "timestamp": "2026-11-20T21:15:00.000Z",
  "dependencies": {
    "supplierA": { "status": "UP", "latencyMs": 8 },
    "supplierB": { "status": "UP", "latencyMs": 10 },
    "redis": { "status": "UP", "latencyMs": 2 },
    "temporal": { "status": "UP", "latencyMs": 5 }
  }
}
```

### 4. Mock Upstream Suppliers
- `GET /supplierA/hotels?city=delhi`
- `GET /supplierB/hotels?city=delhi`
- Test failure simulation: `GET /supplierA/hotels?city=delhi&simulateError=true`

---

## Testing & Verification

### Run Automated Unit & Integration Tests:
```bash
# Verify Redis ZSET filtering and persistence
npx tsx src/tests/redis.spec.ts

# Verify Workflow deduplication, tie-breakers, and fallback logic
npx tsx src/tests/workflow.spec.ts
```

### Postman Collection:
Import [`postman_collection.json`](./postman_collection.json) into Postman. It includes 8 pre-configured test scenarios with automated JavaScript test assertions:
1. Valid city with expected overlaps (`city=delhi`)
2. Price range filtering (`minPrice=5400&maxPrice=6000`)
3. City with no results (`city=unknown`)
4. Validation error handling (`minPrice > maxPrice`)
5. Direct Supplier A verification
6. Direct Supplier B verification
7. Supplier failure simulation
8. Multi-dependency health check

---

## Bonus Points Completed

1. **Deep Health Check (`GET /health`)**:
   - Actively measures latency and availability for Supplier A, Supplier B, Redis, and Temporal.
   - Accurately reports `UP`, `DEGRADED`, or `DOWN`.
2. **Structured Logging & Resilience**:
   - Production JSON logging using **Pino**.
   - Exponential backoff retry policies in Temporal activities.
   - Graceful degradation when one supplier is temporarily offline.

