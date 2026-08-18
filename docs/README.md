# Documentation

## Architecture and protocols

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — capability boundaries and trust model.
- [`WEBHOOKS.md`](WEBHOOKS.md) — signed inbound webhook protocol.
- [`OUTBOUND-REST.md`](OUTBOUND-REST.md) — outbound REST connectors and retry policy.
- [`SOAP-XML.md`](SOAP-XML.md) — SOAP/XML transport and parsing guidance.
- [`JOBS.md`](JOBS.md) — background jobs, dead-letter and replay lifecycle.

## Extending and operating

- [`ADAPTER-GUIDE.md`](ADAPTER-GUIDE.md) — how to implement provider-specific adapters and executors.
- [`OPERATIONS.md`](OPERATIONS.md) — operational safety and replay guidance.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — runtime, networking, persistence and deployment guidance.
- [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md) — pre-production review checklist.

All examples are fictional and provider-neutral. Real integrations should keep credentials, customer schemas and endpoints outside the generic core.
