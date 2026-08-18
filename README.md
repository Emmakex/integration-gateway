# Integration Gateway

> Reusable backend starter for REST APIs, signed webhooks, enterprise adapters and integration workflows.

Integration Gateway is a clean-room TypeScript backend designed to demonstrate reliable integration patterns without coupling the application to a specific CRM, ERP, booking engine, payment provider or vendor API.

The repository remains private while the foundation is validated. Before public release it should be renamed from `backend` to a product-oriented repository name.

![Version](https://img.shields.io/badge/version-0.1.0-0d1b2d)
![Node](https://img.shields.io/badge/Node-24.12%2B-5fa04e)
![Fastify](https://img.shields.io/badge/Fastify-5.10.0-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178c6)
![License](https://img.shields.io/badge/license-MIT-45d6b5)

## v0.1.0 foundation

- Fastify HTTP service with structured logging.
- `/health` and `/ready` operational endpoints.
- Provider-neutral `IntegrationEvent` domain model.
- `IntegrationEventRepository` capability boundary.
- In-memory demo adapter for local/CI use only.
- Application service that validates, normalizes and assigns correlation IDs.
- REST create/list/detail endpoints for fictional integration events.
- Strict TypeScript configuration compatible with Node 24 native type stripping in development.
- Graceful shutdown for `SIGINT` / `SIGTERM`.
- Public-source safety scanner.
- GitHub Actions typecheck, build, HTTP smoke tests and dependency audit.
- MIT license, security policy and contribution guide.

## Architecture

```text
HTTP / future webhooks / jobs
          |
          v
      Fastify
          |
          v
 application services
          |
          v
 repository / connector ports
          |
   demo / REST / SOAP / queues
```

Provider-specific field names and credentials belong in adapters, not in domain models or routes. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

Requires **Node.js 24.12+**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default local URL: `http://127.0.0.1:3001`.

### Example event

```bash
curl -X POST http://127.0.0.1:3001/v1/integration-events \
  -H 'content-type: application/json' \
  --data '{"source":"demo-crm","type":"contact.updated","payload":{"contactId":"demo-123"}}'
```

The example payload is fictional and the in-memory event disappears when the process restarts.

## Routes

```text
GET  /health
GET  /ready
POST /v1/integration-events
GET  /v1/integration-events
GET  /v1/integration-events/:id
```

## Quality checks

```bash
npm run check:safety
npm run typecheck
npm run build
npm audit --audit-level=high
```

CI also starts the compiled server and exercises health/readiness plus a full create/list integration-event flow.

## Planned capability roadmap

| Version | Focus | Status |
|---|---|---|
| `0.1.0` | Fastify foundation, health/readiness, integration domain and CI | Current |
| `0.2.0` | Signed inbound webhooks, idempotency and audit trail | Planned |
| `0.3.0` | Outbound REST connectors, retries and failure classification | Planned |
| `0.4.0` | SOAP/XML adapter boundary and mapping examples | Planned |
| `0.5.0` | Background jobs, dead-letter/replay workflow and observability | Planned |
| `1.0.0` | Stable reusable integration starter | Planned |

## Principles

- Clean-room implementation and fictional payloads only.
- External systems live behind explicit adapters.
- Secrets are server-only and never committed.
- Webhook authenticity and idempotency are enforced before business processing.
- Retries are bounded and only applied to retryable failures.
- Integration events are auditable and replay-safe.
- No client/customer production code, endpoints or credentials.

## Security and contributing

See [`SECURITY.md`](SECURITY.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT © 2026 Eduardo Yauri. See [`LICENSE`](LICENSE).
