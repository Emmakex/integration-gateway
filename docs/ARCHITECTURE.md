# Architecture

Integration Gateway uses explicit capability boundaries so transport code and vendor payloads do not leak into business-facing application services.

```text
Inbound side                                Outbound / async side
------------                                ---------------------
HTTP / signed webhook                       application service
        |                                           |
        v                              +-------------+-------------+
   Fastify routes                    REST          SOAP          Jobs
        |                            port          port          service
        +-- normal REST                |             |             |
        |                         REST adapter   SOAP adapter   JobRepository
        +-- webhook trust boundary     |             |             |
              |                        v             v         JobExecutor
              raw body + HMAC     external REST external SOAP      |
              |                                                retry / DLQ
              idempotency claim
              |
              +------------------+
                                 |
                                 v
                        application services
                                 |
                                 v
                     repository / adapter ports
```

## Capability boundaries

- `domain/` contains provider-neutral integration, webhook/audit, outbound, SOAP and job types.
- `repositories/` defines storage/capability interfaces including connectors, job repository and job executor registry.
- `services/` owns validation, orchestration and state transitions.
- `security/` contains provider-neutral primitives such as HMAC verification.
- `reliability/` contains bounded retry/backoff rules.
- `observability/` contains low-cardinality process-local reference metrics.
- `xml/` contains generic SOAP envelope parsing/building rules.
- `workers/` contains the opt-in polling job worker.
- `adapters/` contains infrastructure-specific implementations, including in-memory reference persistence and REST/SOAP HTTP connectors.
- `app.ts` owns HTTP transport, lifecycle hooks and demo-only surfaces.
- `server.ts` owns process startup and graceful shutdown only.

## Inbound webhook ordering

```text
raw request
  → timestamp/HMAC verification
  → atomic idempotency claim
  → application event
  → claim completion
  → audit record
```

Completed duplicate keys replay the original event. A duplicate while processing is blocked. Failed new processing releases the process-local demo claim for retry.

See [`WEBHOOKS.md`](WEBHOOKS.md).

## Outbound REST ordering

```text
application request
  → connector path/origin validation
  → determine whether method is retry-safe
  → attempt with timeout
  → classify response/failure
  → stop OR bounded backoff/retry
  → normalized OutboundResult
```

The base URL is server configuration and the caller supplies only a relative path selected by application code/adapters. Absolute or scheme-relative destinations are rejected and redirects are disabled.

See [`OUTBOUND-REST.md`](OUTBOUND-REST.md).

## SOAP / XML ordering

```text
provider adapter request
  → validate operation / namespace
  → build escaped SOAP envelope
  → POST to fixed server-configured endpoint
  → enforce timeout + response-size limit
  → parse XML with entity processing disabled
  → normalize SOAP Fault OR response body
  → SoapResult
```

The generic SOAP connector supports SOAP 1.1 and 1.2 transport conventions but does not know any vendor WSDL or business schema. A provider adapter should own operation names, namespaces, authentication and DTO mapping.

Automatic SOAP retries are deliberately absent because operation idempotency is provider-specific. See [`SOAP-XML.md`](SOAP-XML.md).

## Background job ordering

```text
enqueue
  → queued
  → atomic claim
  → running
  → resolve registered executor
  → execute
      ├─ success --------------------→ succeeded
      ├─ retryable + budget --------→ retry_scheduled
      └─ permanent / exhausted -----→ dead_letter

dead_letter
  → explicit replay
  → NEW queued job linked by replayedFromJobId
```

The original dead-letter record is immutable from the replay perspective. The reference in-memory repository claims work only inside one process; a production repository must implement a durable atomic claim/lease or equivalent compare-and-set mechanism for multi-worker deployments.

The worker is disabled by default and controlled by `JOB_WORKER_ENABLED`. See [`JOBS.md`](JOBS.md).

## Trust rules

1. External payloads are untrusted until validated.
2. Credentials never enter domain objects or client-visible configuration.
3. Vendor-specific field names are translated inside adapters/mappers/executors.
4. Correlation IDs are propagated across integration steps.
5. Webhook authenticity is verified against the exact raw body before business processing.
6. Idempotency must become atomic/durable before multi-instance production use.
7. Retry logic distinguishes transient transport failures from permanent client/business failures.
8. Outbound destinations are selected by server configuration/adapters, never arbitrary request URLs.
9. Redirect following stays disabled by default.
10. XML custom entity expansion is disabled in the generic parser.
11. SOAP responses are bounded by a configured maximum size before parsing completes.
12. Jobs are claimed before execution and have a bounded retry budget.
13. Dead-letter replay creates a new record rather than erasing the original failure history.
14. Job payloads do not select arbitrary code modules or remote URLs; executors are registered explicitly in composition.
15. Production persistence must replace in-memory event, audit, idempotency and job adapters before real workloads are accepted.
16. Audit/demo APIs are not public operational dashboards unless separately authenticated and authorized.

The bundled in-memory adapters, metrics and fictional targets exist only for local development, examples and CI.
