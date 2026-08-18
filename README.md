# Integration Gateway

> Reusable backend starter for REST APIs, signed webhooks, enterprise adapters and integration workflows.

Integration Gateway is a clean-room TypeScript backend designed to demonstrate reliable integration patterns without coupling the application to a specific CRM, ERP, booking engine, payment provider or vendor API.

The repository remains private while the product is being validated. Before public release it should be renamed from `backend` to a product-oriented repository name.

![Version](https://img.shields.io/badge/version-0.2.0-0d1b2d)
![Node](https://img.shields.io/badge/Node-24.12%2B-5fa04e)
![Fastify](https://img.shields.io/badge/Fastify-5.10.0-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178c6)
![License](https://img.shields.io/badge/license-MIT-45d6b5)

## v0.2.0 — signed webhooks and idempotency

v0.2 adds a real inbound integration trust boundary on top of the v0.1 Fastify foundation:

- raw-body capture only on webhook routes;
- timestamped HMAC-SHA256 signatures;
- constant-time signature comparison;
- stale/future request rejection;
- mandatory idempotency keys;
- atomic process-local claim state (`claimed`, `in_progress`, `completed`);
- completed-request replay without executing business logic twice;
- correlation ID propagation;
- accepted/replayed/rejected/in-progress audit outcomes;
- optional demo audit API disabled by default;
- native `node:test` coverage for signatures and idempotency;
- end-to-end CI that signs a real request, posts it twice and validates replay behavior.

The bundled event, idempotency and audit repositories are **in-memory demo adapters only**. They must be replaced with durable shared persistence before production traffic.

## Architecture

```text
HTTP request
    |
    +---------------- normal REST ----------------+
    |                                             |
    +-- signed webhook                            |
          |                                       |
          raw body + timestamp + HMAC             |
          |                                       |
          idempotency claim                       |
          |                                       |
          +--------------------+------------------+
                               |
                               v
                    application services
                               |
                               v
                   repository / connector ports
                               |
                    demo / REST / SOAP / queues
```

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md).

## Quick start

Requires **Node.js 24.12+**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default local URL: `http://127.0.0.1:3001`.

Webhook processing is disabled until `WEBHOOK_SIGNING_SECRET` is configured. The optional audit HTTP endpoint is disabled unless `EXPOSE_AUDIT_API=true`.

## Main routes

```text
GET  /health
GET  /ready
POST /v1/integration-events
GET  /v1/integration-events
GET  /v1/integration-events/:id
POST /v1/webhooks/:source/:eventType
GET  /v1/webhook-audit            # only when explicitly enabled
```

### Reference webhook headers

```text
x-integration-timestamp: <unix-seconds>
x-integration-signature: v1=<hmac-sha256-hex>
x-idempotency-key: <stable-provider-event-id>
x-correlation-id: <optional-correlation-id>
```

Signature input:

```text
<timestamp>.<exact-raw-request-body>
```

See [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md) for the complete protocol and production requirements.

## Quality checks

```bash
npm run check:safety
npm test
npm run typecheck
npm run build
npm audit --audit-level=high
```

CI also starts the compiled server and validates health/readiness, normal REST events, valid signed webhook acceptance, idempotent replay, invalid signature rejection and audit output.

## Roadmap

| Version | Focus | Status |
|---|---|---|
| `0.1.0` | Fastify foundation, health/readiness, integration domain and CI | Done |
| `0.2.0` | Signed inbound webhooks, idempotency and audit trail | Current |
| `0.3.0` | Outbound REST connectors, retries and failure classification | Planned |
| `0.4.0` | SOAP/XML adapter boundary and mapping examples | Planned |
| `0.5.0` | Background jobs, dead-letter/replay workflow and observability | Planned |
| `1.0.0` | Stable reusable integration starter | Planned |

## Principles

- Clean-room implementation and fictional payloads only.
- External systems live behind explicit adapters.
- Secrets are server-only and never committed.
- Webhook authenticity is verified against the raw body before processing.
- Idempotency is claimed before business logic.
- Retries will be bounded and limited to retryable failures.
- Integration events and state changes are auditable.
- No client/customer production code, endpoints or credentials.

## Security and contributing

See [`SECURITY.md`](SECURITY.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT © 2026 Eduardo Yauri. See [`LICENSE`](LICENSE).
