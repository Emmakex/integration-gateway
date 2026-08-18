# Integration Gateway

> Reusable backend starter for REST APIs, signed webhooks, enterprise adapters and integration workflows.

Integration Gateway is a clean-room TypeScript backend designed to demonstrate reliable integration patterns without coupling the application to a specific CRM, ERP, booking engine, payment provider or vendor API.

The repository starts private while the foundation is being validated. Before public release it should be renamed from `backend` to a product-oriented repository name.

## Planned capability roadmap

| Version | Focus |
|---|---|
| `0.1.0` | Fastify foundation, health/readiness, integration domain and CI |
| `0.2.0` | Signed inbound webhooks, idempotency and audit trail |
| `0.3.0` | Outbound REST connectors, retries and failure classification |
| `0.4.0` | SOAP/XML adapter boundary and mapping examples |
| `0.5.0` | Background jobs, dead-letter/replay workflow and observability |
| `1.0.0` | Stable reusable integration starter |

## Principles

- Clean-room implementation and fictional payloads only.
- External systems live behind explicit adapters.
- Secrets are server-only and never committed.
- Webhook authenticity and idempotency are enforced before business processing.
- Retries are bounded and only applied to retryable failures.
- Integration events are auditable and replay-safe.
- No client/customer production code or credentials.

## License

MIT © 2026 Eduardo Yauri.
