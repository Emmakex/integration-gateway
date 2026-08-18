# Integration Gateway

> Reusable backend starter for REST APIs, signed webhooks, SOAP/XML adapters and enterprise integration workflows.

Integration Gateway is a clean-room TypeScript backend designed to demonstrate reliable integration patterns without coupling the application to a specific CRM, ERP, booking engine, payment provider or vendor API.

The repository remains private while the final pre-1.0 milestone is validated. The public release will contain only fictional examples, generic adapters and reusable integration patterns.

![Version](https://img.shields.io/badge/version-0.4.0-0d1b2d)
![Node](https://img.shields.io/badge/Node-24.12%2B-5fa04e)
![Fastify](https://img.shields.io/badge/Fastify-5.10.0-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178c6)
![License](https://img.shields.io/badge/license-MIT-45d6b5)

## What v0.4 includes

### REST foundation

- Fastify service with health/readiness endpoints.
- Provider-neutral integration event model.
- Repository / service / adapter boundaries.
- Strict TypeScript, tests, CI and dependency audit.

### Signed inbound webhooks

- exact raw-body HMAC-SHA256 verification;
- timestamp freshness checks;
- atomic demo idempotency claims;
- completed-request replay and duplicate-in-progress blocking;
- correlation IDs and audit records.

### Outbound REST

- server-configured base URL;
- path/origin validation and redirects disabled;
- timeout and normalized failure classification;
- bounded exponential backoff and capped `Retry-After`;
- retries only when the HTTP operation is safe/idempotent.

### SOAP / XML

- provider-neutral `SoapConnector` boundary;
- SOAP 1.1 and SOAP 1.2 envelope generation;
- SOAP 1.1 `SOAPAction` and SOAP 1.2 action content-type support;
- XML parsing with custom entity expansion disabled;
- normalized SOAP 1.1 / 1.2 Fault handling;
- server-configured endpoint only;
- redirects disabled;
- request timeout and maximum response-size enforcement;
- fictional success/fault target for end-to-end CI.

The generic SOAP connector intentionally performs no automatic retry. Operation idempotency is provider-specific and will be handled by the job/replay layer in v0.5.

## Architecture

```text
Inbound                                 Outbound
-------                                 --------
Signed webhook                          application service
      |                                      |
 raw body + HMAC                     +--------+--------+
      |                              |                 |
 idempotency claim              REST connector    SOAP connector
      |                              |                 |
      +---------------+              |          envelope / Fault
                      |              |                 |
                      v              v                 v
                 application services           external systems
                      |
                      v
               repositories / adapters
```

Provider-specific DTOs, operation names, credentials and business mappings belong in dedicated adapters, not generic routes.

Read:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md)
- [`docs/OUTBOUND-REST.md`](docs/OUTBOUND-REST.md)
- [`docs/SOAP-XML.md`](docs/SOAP-XML.md)

## Quick start

Requires **Node.js 24.12+**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default local URL: `http://127.0.0.1:3001`.

All external integration capabilities are disabled until their server-side configuration is provided. Demo APIs/targets remain disabled unless explicitly enabled.

## Main routes

```text
GET  /health
GET  /ready
POST /v1/integration-events
GET  /v1/integration-events
GET  /v1/integration-events/:id
POST /v1/webhooks/:source/:eventType
GET  /v1/webhook-audit             # opt-in demo/read endpoint
POST /v1/demo/outbound             # opt-in demo only
ANY  /v1/demo-target/retryable     # opt-in fictional REST target
POST /v1/demo/soap                 # opt-in demo only
POST /v1/demo-soap-target          # opt-in fictional SOAP target
```

## Quality checks

```bash
npm run check:safety
npm test
npm run typecheck
npm run build
npm audit --audit-level=high
```

CI validates unit tests, TypeScript, compiled-server smoke tests, webhook signatures/replay, bounded REST retries and SOAP success/fault behaviour.

## Roadmap

| Version | Focus | Status |
|---|---|---|
| `0.1.0` | Fastify foundation, health/readiness, integration domain and CI | Done |
| `0.2.0` | Signed inbound webhooks, idempotency and audit trail | Done |
| `0.3.0` | Outbound REST connectors, retries and failure classification | Done |
| `0.4.0` | SOAP/XML adapter boundary and mapping examples | Current |
| `0.5.0` | Background jobs, dead-letter/replay workflow and observability | Planned |
| `1.0.0` | Stable reusable integration starter | Planned |

## Principles

- Clean-room implementation and fictional payloads only.
- External systems live behind explicit adapters.
- Secrets and remote endpoints are server-only configuration.
- Webhook authenticity is verified before business processing.
- Retryable writes require explicit idempotency semantics.
- REST/SOAP destinations are never arbitrary user-supplied URLs.
- XML entity expansion is disabled in the generic parser.
- Integration state changes should remain auditable and replay-safe.
- No client/customer production code, endpoints or credentials.

## Security and contributing

See [`SECURITY.md`](SECURITY.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT © 2026 Eduardo Yauri. See [`LICENSE`](LICENSE).
