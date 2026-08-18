# Production Checklist

Use this checklist before connecting Integration Gateway to real customer or business systems.

## Source and release

- [ ] Deploy an immutable reviewed commit/tag.
- [ ] `npm ci` succeeds from the committed lockfile.
- [ ] `npm run verify` passes.
- [ ] `npm audit --audit-level=high` passes or every exception is documented and accepted.
- [ ] Demo fixtures contain no real customer data.
- [ ] No production credentials/endpoints are committed to Git.

## Secrets and configuration

- [ ] Credentials are stored in the deployment secret manager.
- [ ] `ENABLE_DEMO_API=false`.
- [ ] `ENABLE_DEMO_TARGET=false`.
- [ ] `EXPOSE_AUDIT_API=false` unless a separately protected operations surface is intentionally deployed.
- [ ] Outbound REST/SOAP destinations are server-controlled and reviewed.
- [ ] Timeouts/retry budgets match provider SLAs and business semantics.

## Webhooks

- [ ] Provider authenticity is verified before business processing.
- [ ] Timestamp/replay protection matches provider capabilities.
- [ ] Idempotency uses a durable atomic shared store.
- [ ] Idempotency keys are scoped correctly per provider/event type.
- [ ] Rejected/signature-failed payloads do not leak secrets into logs.

## REST / SOAP adapters

- [ ] Every provider has a dedicated mapper/adapter rather than a caller-controlled generic destination.
- [ ] Authentication headers never enter generic domain objects.
- [ ] Response payloads are validated before business use.
- [ ] Redirect behavior is reviewed and remains disabled unless explicitly required.
- [ ] SOAP entity processing remains disabled.
- [ ] SOAP response-size limits are appropriate.
- [ ] State-changing retries have provider-specific idempotency guarantees.

## Jobs and replay

- [ ] In-memory job storage has been replaced with durable shared persistence/queue infrastructure.
- [ ] Job claims/leases are atomic across workers.
- [ ] Lease expiry/crash recovery behavior is defined.
- [ ] Worker concurrency is bounded.
- [ ] Retry budgets/backoff are bounded.
- [ ] Dead-letter retention and alerting are configured.
- [ ] Replay requires authentication/authorization and records operator + reason.
- [ ] Replay safety/idempotency is reviewed before repeating provider writes.

## API and network

- [ ] TLS is enforced.
- [ ] Ingress rate limiting is configured.
- [ ] Operational endpoints are authenticated and authorized.
- [ ] Egress restrictions/allowlists are configured where feasible.
- [ ] Request/body size limits are reviewed for public endpoints.
- [ ] CORS is not enabled broadly unless a real browser use case requires it.

## Persistence and privacy

- [ ] Data retention periods are defined.
- [ ] Personal/sensitive fields are minimized.
- [ ] Logs do not contain secrets or unnecessary payload data.
- [ ] Backups/recovery are tested for durable integration state.
- [ ] Access to audit/job/event data follows least privilege.

## Observability and operations

- [ ] Structured logs are exported.
- [ ] Metrics are low-cardinality and payload-free.
- [ ] Trace/correlation IDs propagate across relevant calls/jobs.
- [ ] Alerts exist for sustained failures, dead-letter growth, stale jobs and worker health.
- [ ] Provider outage runbooks and replay procedures exist.

## Deployment

- [ ] Graceful shutdown is tested.
- [ ] Rollback procedure is documented.
- [ ] Health/readiness probes match deployment semantics.
- [ ] Capacity and timeout settings have been load-tested for the intended workload.

Passing this checklist does not replace a threat model, privacy review, provider-specific integration review or organization-specific operational controls.
