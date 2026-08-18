# Adapter Guide

Integration Gateway keeps provider-specific behavior outside the generic domain and HTTP surfaces. New integrations should enter the system through explicit adapters, mappers and executors.

## Choose the correct boundary

### Inbound webhook provider

Own in the provider adapter/service:

- provider signature header names and verification rules when they differ from the reference HMAC protocol;
- provider event identifiers used for idempotency;
- provider payload validation;
- mapping into provider-neutral application events.

Do not pass raw unvalidated provider payloads deeper than necessary.

### Outbound REST provider

Own in a dedicated adapter:

- server-side base URL and credentials;
- fixed/allowlisted relative paths;
- request DTO mapping;
- provider idempotency conventions;
- provider-specific retryable status codes;
- response validation and normalized result mapping.

Never expose a generic caller-controlled absolute URL.

### SOAP provider

Own in a dedicated adapter:

- WSDL-derived operation names and namespaces;
- authentication headers;
- provider DTO ↔ SOAP payload mapping;
- SOAP action conventions;
- interpretation of provider-specific Fault detail;
- operation-specific idempotency/retry decisions.

The generic SOAP connector only handles transport, envelope construction, bounded response reading and Fault normalization.

### Background job executor

Register a fixed executor type in composition. The executor should:

1. validate the job payload;
2. load required server-side credentials/configuration;
3. invoke a specific connector/service;
4. classify the outcome as success, retryable failure or permanent failure;
5. avoid logging secrets or full sensitive payloads.

A job payload must not select arbitrary modules, functions, URLs or credentials.

## Mapping pattern

```text
external DTO
   ↓ validate
provider mapper
   ↓
application/domain DTO
   ↓
service
   ↓
provider mapper
   ↓
external request DTO
```

Keep vendor field names at the edge. This makes tests smaller and allows a provider implementation to change without contaminating the core domain.

## Configuration

Secrets belong in the deployment secret store. Non-secret endpoints, timeouts and policy values belong in server-side configuration. Document every new environment variable in `.env.example` and add a safe default where possible.

## Tests required for a new adapter

- happy path;
- malformed/invalid external payload;
- authentication/signature failure when applicable;
- timeout/network failure;
- provider permanent failure;
- retryable failure and idempotency behavior when applicable;
- redaction/no-secret logging expectations;
- mapping edge cases.

Use fictional fixtures only.
