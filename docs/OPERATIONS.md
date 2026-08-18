# Operations Guidance

Integration Gateway v0.5 includes reference operational patterns for background integrations. The bundled HTTP surfaces are demo-only and are not an authenticated production control plane.

## Operational invariants

- A job is claimed before execution.
- A claimed job increments its attempt count exactly once per claim.
- Retryable failures are scheduled with a bounded retry budget.
- Permanent failures or exhausted retry budgets move to `dead_letter`.
- Replay creates a new job and never rewrites the original dead-letter history.
- Correlation IDs are preserved across replay.
- Executors are registered explicitly by job type; a payload never chooses executable code.

## Before production

Replace the in-memory job repository with durable shared persistence or a queue system that supports atomic claims/leases. Protect all operations endpoints with authentication, authorization and rate limits. Record the operator and reason for replay actions. Add provider-specific idempotency controls before replaying state-changing calls.

Export low-cardinality metrics for queue depth, age of oldest due job, attempts, retries, successes and dead-letter counts. Alert on sustained dead-letter growth, stale queued jobs, repeated provider failures and worker liveness rather than logging full payloads.

## Safe replay procedure

1. inspect the original job and provider state;
2. confirm the original operation is safe to repeat or has provider idempotency protection;
3. record an operator/reason audit entry;
4. create a new replay job linked to the original;
5. monitor the replay outcome;
6. preserve both records for traceability.

See [`JOBS.md`](JOBS.md) for the reference lifecycle and [`../SECURITY.md`](../SECURITY.md) for security requirements.
