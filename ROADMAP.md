# Roadmap

Integration Gateway 1.0 defines the stable provider-neutral baseline. Future work should preserve the existing trust boundaries rather than bypass them.

## 1.x candidates

- durable reference adapters for PostgreSQL/Redis-backed idempotency and jobs;
- OpenTelemetry-compatible tracing/metrics adapters;
- authenticated operations API example with role-based replay controls;
- provider-specific adapter examples using fictional schemas;
- circuit-breaker capability behind an explicit connector policy;
- concurrency/lease examples for multi-worker job processing;
- structured mapping/validation helpers for external DTOs;
- optional container/deployment examples.

## Non-goals

- embedding real customer credentials, payloads or endpoints;
- turning the generic gateway into an arbitrary HTTP/SOAP proxy;
- automatically retrying state-changing operations without provider-specific idempotency guarantees;
- shipping a production admin surface without authentication/authorization;
- coupling the core domain to one CRM, ERP, travel platform or payment vendor.

Substantial additions should be proposed through an issue before implementation and must include security implications, tests and documentation.
