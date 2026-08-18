# Contributing

Thanks for helping improve Integration Gateway.

## Development

Requirements:

```text
Node.js >=24.12 <25
npm >=11 <12
```

Setup:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Before opening a pull request:

```bash
npm run verify
npm audit --audit-level=high
```

## Architecture rules

- Keep provider-specific payloads inside adapters, mappers or executors.
- Keep domain types independent from Fastify and vendor SDKs.
- Add external integrations behind explicit interfaces.
- Never expose caller-controlled arbitrary REST/SOAP destinations.
- Keep authentication credentials server-side and out of generic domain DTOs.
- Use fictional data in examples and tests.
- Never commit customer endpoints, credentials or production payloads.
- Document every new environment variable in `.env.example` with a safe default where possible.
- Security-sensitive flows such as webhooks, retries, XML parsing, jobs and replay require tests and documentation.
- Preserve bounded retry budgets and explicit idempotency semantics.
- Do not weaken the public-source safety scanner to silence a finding unless the exception is narrow, protocol-standard and documented.

## Pull requests

A focused PR should explain:

1. the integration/problem being addressed;
2. which capability boundary changes;
3. security/retry/idempotency implications;
4. tests added or updated;
5. documentation/configuration changes;
6. any production-boundary impact.

Avoid mixing dependency upgrades, broad refactors and new behavior unless they are inseparable.

## Dependency changes

Dependencies are pinned to exact versions. Update the lockfile whenever `package.json` changes and keep the high-severity dependency audit green. Prefer platform/native Node capabilities over adding a new dependency when the maintenance/security tradeoff does not justify it.

## Security

Do not disclose exploitable vulnerabilities, secrets or private customer data in public issues or pull requests. Follow [`SECURITY.md`](SECURITY.md).
