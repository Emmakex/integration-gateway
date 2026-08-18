# Changelog

All notable changes to Integration Gateway are documented here.

## [0.4.0] - 2026-08-18

### Added

- provider-neutral `SoapConnector` boundary;
- SOAP 1.1 and SOAP 1.2 envelope generation;
- SOAPAction/content-type transport conventions;
- XML parsing with entity processing disabled;
- normalized SOAP 1.1 / 1.2 Fault handling;
- fixed server-side SOAP endpoint configuration;
- request timeout and maximum response-size controls;
- fictional SOAP success/fault routes for CI;
- SOAP/XML security and architecture documentation;
- SOAP envelope/fault unit tests.

## [0.3.0] - 2026-08-18

### Added

- provider-neutral outbound REST connector boundary;
- server-configured base URL and same-origin relative-path validation;
- timeout and normalized failure classification;
- bounded exponential retry policy with capped `Retry-After` support;
- retry safety rules for idempotent methods and idempotency-key protected writes;
- fictional `503 → 503 → 200` target used by CI;
- outbound REST architecture/security documentation.

## [0.2.0] - 2026-08-18

### Added

- signed inbound webhooks using timestamped HMAC-SHA256 over the exact raw body;
- timestamp freshness checks and constant-time digest comparison;
- in-memory idempotency claim lifecycle and replay behaviour;
- webhook audit trail and opt-in demo audit endpoint;
- unit tests and real signed-webhook CI coverage.

## [0.1.0] - 2026-08-18

### Added

- Fastify/TypeScript backend foundation;
- health/readiness endpoints;
- provider-neutral integration event model;
- repository/service/adapter boundaries;
- in-memory demo persistence;
- graceful shutdown, public-source safety checks and CI smoke tests.
