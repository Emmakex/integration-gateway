# Contributing

Thanks for helping improve Integration Gateway.

## Development

Requirements: **Node.js 24.12+**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Before opening a pull request:

```bash
npm run check
npm audit --audit-level=high
```

## Architecture rules

- Keep provider-specific payloads inside adapters or mappers.
- Keep domain types independent from Fastify and vendor SDKs.
- Add external integrations behind explicit interfaces.
- Use fictional data in examples and tests.
- Never commit customer endpoints, credentials or production payloads.
- Document any new environment variable in `.env.example`.
- Security-sensitive flows such as webhooks, retries and replay must include tests and documentation.
