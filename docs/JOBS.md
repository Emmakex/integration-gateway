# Background Jobs, Dead Letter and Replay

v0.5 adds a provider-neutral background-work boundary for integrations that should not be completed inside an inbound HTTP request.

The bundled runtime is intentionally **in-memory only**. It demonstrates lifecycle and safety rules; production deployments must replace the repository with durable atomic storage before real jobs are accepted.

## Lifecycle

```text
queued
  |
  v
running
  |\
  | \ permanent failure / exhausted budget
  |  ------------------------------> dead_letter
  |
  +-- retryable failure --> retry_scheduled --(availableAt)--> running
  |
  +-- success -----------> succeeded

dead_letter -- replay --> NEW queued job
```

Replay never mutates the original dead-letter record. It creates a new job carrying `replayedFromJobId` and preserves the original correlation ID.

## Ports

```text
JobRepository
  create / find / list / atomic claim / save / status counts

JobExecutorRegistry
  job type -> explicit JobExecutor

JobExecutor
  IntegrationJob -> success | retryable failure | permanent failure
```

A job payload does **not** contain executable code, URLs to call or arbitrary module names. Application composition registers known executor types explicitly.

## Atomic claim

The in-memory adapter performs the claim synchronously inside the Node.js process before returning control. That is sufficient for tests and a single-process demo only.

A production repository must provide a storage-level atomic claim/lease or equivalent compare-and-set operation so multiple workers cannot execute the same job concurrently.

## Retry scheduling

Retry delay uses bounded exponential backoff:

```text
min(baseDelay * 2^(attempt - 1), maxDelay)
```

A retryable failure moves the job to `retry_scheduled` only while `attempts < maxAttempts`. Once the budget is exhausted, the job moves to `dead_letter`.

Executors should classify provider failures explicitly. Unexpected thrown executor errors are treated as retryable until the job budget is exhausted, but the public job record stores only a generic message rather than an exception stack.

## Dead-letter and replay

Dead-letter is a terminal state for a specific job record. Replay is an explicit operator action that creates a new job.

Production replay should additionally require:

1. authentication and authorization;
2. an operator/reason audit record;
3. provider/idempotency review before replaying state-changing operations;
4. rate limiting / bulk replay controls;
5. durable linkage between original and replayed jobs.

## Worker

`JobWorker` is an opt-in polling loop:

```text
JOB_WORKER_ENABLED=false
JOB_POLL_INTERVAL_MS=1000
```

The worker starts with the Fastify lifecycle and stops on application close. It processes one due job at a time and immediately checks for more work after a successful claim; when idle or after infrastructure errors it waits for the configured poll interval.

For horizontal production workloads, use a durable queue/database and provider-appropriate concurrency/lease controls rather than the in-memory worker.

## Metrics

The reference runtime keeps process-local counters for:

- enqueued jobs;
- execution attempts;
- succeeded jobs;
- retries scheduled;
- dead-lettered jobs;
- replays;
- current status counts.

These counters intentionally contain no payloads or customer data. They reset when the process restarts.

A real deployment should export equivalent low-cardinality metrics to its monitoring system and avoid labels containing job IDs, correlation IDs, URLs, emails or provider payload values.

## Demo API

The following routes exist only when `ENABLE_DEMO_API=true`:

```text
POST /v1/demo/jobs
POST /v1/demo/jobs/process
GET  /v1/demo/jobs
GET  /v1/demo/jobs/:id
POST /v1/demo/jobs/:id/replay
GET  /v1/demo/job-metrics
```

Only the fixed fictional executor type `demo.integration` is registered in the reference runtime.

Demo modes:

- `eventual_success` — fails transiently for a configurable number of attempts and then succeeds;
- `permanent_failure` — immediately produces a permanent dead-letter result.

These routes are not a production job administration API.
