# KYC Service

A production-grade **KYC (Know Your Customer) verification microservice** built with TypeScript, Node.js, Express, Sequelize, and JWT. Designed as a realistic reference implementation: clean architecture, strict typing, runtime validation, structured logging, automated risk scoring with a reviewer workflow, and full audit trail.

> Built by [Hristijan Mijalkov](https://github.com/) as a showcase of backend engineering practices used in regulated fintech / compliance domains.

---

## Highlights

- **TypeScript end-to-end** with strict compiler settings (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Layered architecture** — routes → services → models, no business logic in controllers
- **Sequelize ORM** with typed model attributes and migration-ready schema (SQLite for dev, MySQL for prod)
- **JWT authentication** with role-based authorization (`admin`, `reviewer`, `user`)
- **Runtime validation** via Zod for every request body — defense in depth alongside TypeScript
- **Deterministic risk scoring** with auto-decision bands and a manual review queue
- **Audit log** for every state transition, queryable for compliance reporting
- **OpenAPI 3.0 spec** served at `/docs` (Swagger UI) — generated from a single source of truth
- **Security middleware**: Helmet, CORS, rate limiting, payload size caps, log redaction of secrets
- **Vitest** test suite covering risk scoring, auth, and end-to-end KYC flows
- **GitHub Actions CI**: lint → typecheck → test → build on every push and PR
- **Multi-stage Dockerfile** + `docker compose` stack with MySQL for one-command local prod

---

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Client     ├───▶│  Express +   ├───▶│  Service     ├───▶│  Sequelize   │
│              │    │  Zod + JWT   │    │  layer       │    │  (MySQL/     │
└──────────────┘    │  middleware  │    │              │    │   SQLite)    │
                   └──────┬───────┘    └──────┬───────┘    └──────────────┘
                          │                   │
                          ▼                   ▼
                   ┌──────────────┐    ┌──────────────┐
                   │  Helmet,     │    │  AuditLog    │
                   │  rate-limit, │    │  table       │
                   │  pino logs   │    │              │
                   └──────────────┘    └──────────────┘
```

### Folders

```
src/
├── config/        # Env parsing (Zod), Sequelize connection
├── middleware/    # auth (JWT), validate (Zod), errorHandler
├── models/        # User, KycProfile, AuditLog
├── routes/        # auth, kyc — thin Express handlers
├── services/      # authService, kycService — all business logic
├── utils/         # logger (pino), HTTP error helpers
└── server.ts      # bootstrap
docs/openapi.yaml  # API spec, served at /docs
test/              # Vitest suite
.github/workflows  # CI pipeline
```

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/<your-user>/kyc-service.git
cd kyc-service
npm install

# 2. Configure
cp .env.example .env
# Edit JWT_SECRET to a long random string

# 3. Run in dev (SQLite, hot reload)
npm run dev
```

Open:
- `http://localhost:3000/health` — liveness probe
- `http://localhost:3000/docs` — interactive API explorer

### With Docker (MySQL + API)

```bash
docker compose up --build
```

### Tests

```bash
npm test            # vitest run with v8 coverage
npm run typecheck   # tsc --noEmit
npm run lint
```

---

## API at a glance

| Method | Path                          | Auth         | Purpose                              |
| ------ | ----------------------------- | ------------ | ------------------------------------ |
| GET    | `/health`                     | —            | Liveness probe                       |
| POST   | `/api/auth/register`          | —            | Create user, returns JWT             |
| POST   | `/api/auth/login`             | —            | Exchange credentials for JWT         |
| POST   | `/api/kyc/profile`            | user         | Submit a KYC profile for review      |
| GET    | `/api/kyc/profile/me`         | user         | Fetch own profile                    |
| GET    | `/api/kyc/review/queue`       | reviewer/admin | List profiles awaiting manual review |
| POST   | `/api/kyc/review/:id/decide`  | reviewer/admin | Approve or reject a profile          |

Full schema available at `/docs` (OpenAPI 3.0).

### Example flow

```bash
# Register
TOKEN=$(curl -s -X POST localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"longenough123"}' | jq -r .token)

# Submit KYC
curl -X POST localhost:3000/api/kyc/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Jane Doe",
    "dateOfBirth": "1992-06-15",
    "nationality": "NL",
    "documentType": "passport",
    "documentNumber": "NL12345678"
  }'
# → 201 { "status": "approved", "riskScore": 0, ... }
```

---

## Risk scoring & decisioning

Risk is calculated deterministically in `services/kycService.ts:computeRiskScore` so its behavior is testable and auditable. In production this layer would be replaced with (or composed alongside) a real KYC provider integration — Onfido, Sumsub, Veriff, Jumio.

| Score   | Decision     |
| ------- | ------------ |
| `0–19`  | `approved` (auto) |
| `20–69` | `in_review` (manual) |
| `70+`   | `rejected` (auto) |

Every submission and every reviewer decision writes an `AuditLog` row with `actorId`, `action`, `resource`, `resourceId`, and `metadata`.

---

## Security posture

- **Helmet** sets sane HTTP security headers
- **Rate limit** of 120 req/min/IP, configurable per route
- **JWT** secret validated at boot (min 16 chars), no fallbacks
- **Bcrypt** with cost factor 12
- **Zod** validation rejects malformed payloads before they hit business logic
- **Pino** redacts `authorization`, `password`, and `passwordHash` from logs
- **Express JSON** body limit of 256 KB
- **Sequelize** parameterized queries throughout — no string-built SQL

---

## Production readiness checklist

- [x] Strict TypeScript, no `any` in business code
- [x] Configuration via environment, validated at boot
- [x] Health endpoint for orchestrators
- [x] Structured JSON logs with redaction
- [x] OpenAPI spec served alongside the API
- [x] CI: lint, typecheck, test, build
- [x] Multi-stage Docker image running as non-root
- [ ] Real KYC provider integration (Onfido / Sumsub)
- [ ] Background job worker for review escalation
- [ ] Metrics (Prometheus) and tracing (OpenTelemetry)

---

## License

MIT — see [LICENSE](./LICENSE).
