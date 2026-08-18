# Deployment

Integration Gateway is a stateless HTTP process only when the reference in-memory repositories and worker state are replaced by durable shared infrastructure. Treat the bundled runtime as a development/reference implementation until the production checklist is satisfied.

## Runtime

Supported baseline:

```text
Node.js >=24.12 <25
npm >=11 <12
```

Build and start:

```bash
npm ci
npm run verify
npm run build
npm start
```

The compiled entry point is `dist/server.js` via the `npm start` script.

## Environment

Start from `.env.example`. Keep secrets in the deployment platform's secret store, not in files committed to Git.

At minimum review:

- `HOST` / `PORT`;
- webhook signing configuration;
- REST/SOAP provider endpoints and credentials inside provider adapters;
- timeout/retry policy;
- worker enablement and polling policy;
- demo/audit flags.

All demo flags should remain `false` in production.

## Networking

- Terminate TLS at a trusted reverse proxy/load balancer or application platform.
- Restrict egress to required provider destinations where infrastructure supports it.
- Keep REST/SOAP destinations server-configured rather than request-controlled.
- Apply ingress rate limiting appropriate to webhook and API surfaces.
- Protect any operational/audit endpoints with authentication and authorization before exposure.

## Persistence and scaling

The reference in-memory repositories are not suitable for horizontal scaling or durable workloads. Replace them before enabling multi-instance traffic.

Production implementations should provide:

- durable integration event storage where required;
- atomic shared idempotency claims;
- durable webhook/audit records according to retention policy;
- durable job queue/repository with atomic claim/lease semantics;
- concurrency limits and lease expiry/recovery behavior;
- provider-specific idempotency keys for state-changing operations.

## Worker deployment

`JOB_WORKER_ENABLED=false` by default.

When durable job persistence exists, the worker can run in the same service or as a dedicated worker process depending on the deployment. For higher throughput prefer dedicated workers with explicit concurrency, lease ownership and shutdown semantics.

Do not run multiple workers against the bundled in-memory repository and assume distributed safety.

## Health and readiness

`GET /health` confirms the process is alive. `GET /ready` reports which optional reference capabilities are configured/enabled. A production adapter may need deeper readiness checks for databases, queues or required provider configuration.

Avoid making readiness dependent on every external SaaS provider being available at every instant; transient provider outages should normally be handled by retry/queue logic rather than removing all gateway instances from service.

## Observability

Export structured logs, traces and low-cardinality metrics to the deployment monitoring stack. Do not log secrets, authorization headers, full sensitive payloads or raw customer XML unless a separately governed diagnostic mechanism explicitly requires it.

Useful alerts include sustained webhook rejection rates, queue age, dead-letter growth, retry exhaustion, provider failure rate and worker liveness.

See [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md) before accepting real traffic.
