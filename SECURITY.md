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
- Webhook signatures must be verified before business logic.
- Idempotency keys must be scoped and persisted before accepting real webhook workloads.
- Retry policies must be bounded and must not retry permanent validation/business failures.
- Integration logs must not contain secrets or unnecessary personal data.
- Production persistence must replace in-memory adapters.

If a credential is committed accidentally, deleting it from a later commit is insufficient. Revoke or rotate it and assess Git history exposure.
