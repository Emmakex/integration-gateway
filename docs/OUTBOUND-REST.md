# Outbound REST Connectors

v0.3 adds a provider-neutral outbound REST connector boundary with bounded retries and explicit failure classification.

## Security model

The connector is **not an arbitrary HTTP proxy**.

- The base URL comes only from server-side `OUTBOUND_BASE_URL` configuration.
- Application services/adapters choose the relative path.
- Request paths must start with `/`, cannot be scheme-relative (`//...`) and cannot contain an absolute URL.
- The resolved target must keep the configured origin.
- Embedded credentials in the base URL are rejected.
- Redirects are not followed.

Real API credentials should be added by a dedicated vendor adapter from a secret store, never accepted from a browser/client request or committed to the repository.

## Failure classification

| Condition | Kind | Retryable |
|---|---|---|
| Network failure | `network` | Yes |
| Client timeout / HTTP 408 | `timeout` | Yes |
| HTTP 429 | `rate_limited` | Yes |
| HTTP 5xx | `server` | Yes |
| Other HTTP 4xx | `client` | No |
| Invalid declared JSON | `invalid_response` | No |
| Invalid connector/path configuration | `configuration` | No |

A retryable failure does **not** automatically mean every HTTP method may be retried.

## Idempotency and retries

Automatic retries are allowed for naturally idempotent methods:

```text
GET
PUT
DELETE
```

`POST` and `PATCH` are retried only when the request includes an explicit idempotency key. This avoids blindly repeating non-idempotent writes after an ambiguous network/server failure.

A production integration must use the idempotency mechanism expected by the remote provider. Some vendors use `Idempotency-Key`; others use a request ID or business key. Translate that convention inside the provider adapter.

## Backoff

The reference connector uses capped exponential backoff:

```text
baseDelay × 2^(attempt - 1)
```

bounded by `OUTBOUND_RETRY_MAX_DELAY_MS`.

When a remote service supplies a valid `Retry-After` header, the connector uses that value but still caps the delay to the configured maximum.

## Timeouts

Every attempt uses `AbortSignal.timeout(OUTBOUND_TIMEOUT_MS)`.

A production timeout should be selected per integration/SLA. Avoid extremely long synchronous HTTP requests for workloads better handled by a queue/job system.

## Demo routes

The repository includes an opt-in fictional workflow for CI and local demonstrations:

```text
POST /v1/demo/outbound
        |
        v
/v1/demo-target/retryable
        |
        503 → 503 → 200
```

The target deliberately fails twice and then succeeds, allowing CI to verify a real bounded retry sequence.

Both demo surfaces are disabled unless explicitly enabled:

```text
ENABLE_DEMO_API=true
ENABLE_DEMO_TARGET=true
```

Do not expose these routes in production.

## Production checklist

Before connecting a real external system:

1. create a dedicated provider adapter/service rather than exposing arbitrary paths;
2. keep credentials in the deployment secret store;
3. define provider-specific idempotency semantics;
4. set timeout/retry limits based on the provider SLA;
5. define which response codes are genuinely retryable for that provider;
6. add structured outbound attempt/audit metrics without logging secrets;
7. consider circuit breaking/queues for sustained failures;
8. test rate limiting, timeouts, malformed responses and ambiguous write failures.
