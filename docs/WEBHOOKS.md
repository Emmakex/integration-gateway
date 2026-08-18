# Signed Webhooks and Idempotency

v0.2 introduces a provider-neutral inbound webhook pattern. It is intended as a reference implementation, not a universal vendor protocol.

## Endpoint

```text
POST /v1/webhooks/:source/:eventType
```

Required headers:

```text
x-integration-timestamp: <unix-seconds>
x-integration-signature: v1=<hex-hmac-sha256>
x-idempotency-key: <stable-provider-event-id>
```

Optional:

```text
x-correlation-id: <trace-or-business-correlation-id>
```

## Signature format

The signature input is the exact raw HTTP body prefixed by the timestamp:

```text
<timestamp>.<raw-body>
```

The digest is:

```text
HMAC-SHA256(signing-secret, signature-input)
```

and the header value is encoded as:

```text
v1=<64-character-hex-digest>
```

The implementation compares digests with `timingSafeEqual` and rejects stale/future timestamps before idempotent processing.

## Processing order

```text
raw request
    |
    v
required idempotency key
    |
    v
timestamp + HMAC verification
    |
    v
idempotency claim
    |----------------------------|
    | new                        | completed
    v                            v
create event                 return existing event
    |                            |
    v                            v
complete claim               audit replay
    |
    v
audit accepted
```

A second request arriving while the same idempotency key is still pending receives a conflict instead of executing business logic twice.

If processing fails after a new claim, the in-memory demo repository releases that pending claim so the request can be retried.

## Audit outcomes

The demo audit records one of:

- `accepted` — a new valid event was accepted;
- `replayed` — an already completed idempotency key returned its prior event;
- `in_progress` — concurrent duplicate processing was blocked;
- `rejected` — signature, timestamp, configuration or processing validation failed.

`GET /v1/webhook-audit` is registered only when `EXPOSE_AUDIT_API=true`. This read API is for demo/testing only. A production audit surface must be authenticated/authorized or kept internal.

## Production requirements

The bundled idempotency and audit adapters are process-local memory stores. Before real webhook traffic:

1. use durable shared persistence;
2. make idempotency claims atomic across instances;
3. define retention/expiry policy for idempotency keys;
4. protect audit data and minimize personal information;
5. rotate/manage signing secrets using the deployment platform's secret store;
6. map each vendor's signature protocol inside a dedicated adapter when it differs from this reference protocol;
7. monitor rejected signatures, stale requests, replay volume and processing failures.
