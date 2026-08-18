# Security Policy

## Reporting

Do not publish credentials, exploitable vulnerabilities or private customer data in public issues.

Report security concerns privately to **eduardoyauri@emmake.com** with the affected component, reproduction steps and expected impact.

## Repository rules

- Never commit `.env` files other than `.env.example`.
- Never commit API keys, passwords, cookies, private keys or bearer tokens.
- Demo payloads must remain fictional.
- External endpoints and credentials must be configuration-driven.
- Incoming payloads are untrusted and must be validated before processing.
- Webhook signatures must be verified against the exact raw body before business logic.
- Idempotency keys must be scoped and persisted before accepting real webhook workloads.
- Retry policies must be bounded and must not retry permanent validation/business failures.
- `POST`/`PATCH` retries require provider-appropriate idempotency semantics.
- Do not accept arbitrary absolute outbound URLs from API callers. Remote destinations must come from reviewed server-side configuration/adapters.
- Keep redirect following disabled by default for outbound connectors.
- Validate connector-relative paths and preserve the configured remote origin.
- SOAP endpoints must come from reviewed server-side configuration and must not embed credentials.
- XML entity processing remains disabled for generic SOAP response parsing.
- Enforce response-size limits before treating remote SOAP/XML data as trusted application input.
- Do not expose generic SOAP operation/namespace selection directly to untrusted public callers; provider adapters should own those values.
- Automatic SOAP retries require provider-specific idempotency guarantees and should be handled through the job/replay layer rather than the generic connector.
- Real provider credentials belong in a deployment secret store and provider-specific adapter, not generic request payloads.
- Integration logs must not contain secrets, full sensitive XML payloads or unnecessary personal data.
- Demo/audit endpoints must remain disabled or separately authenticated in production.
- Production persistence must replace in-memory event, audit and idempotency adapters.

If a credential is committed accidentally, deleting it from a later commit is insufficient. Revoke or rotate it and assess Git history exposure.
