# Support

Integration Gateway is an open-source reference project maintained on a best-effort basis.

## Use GitHub issues for

- reproducible bugs in the generic integration framework;
- documentation problems;
- feature proposals that remain provider-neutral;
- compatibility problems with the documented Node/Fastify/TypeScript baseline.

## Do not use public issues for

- credentials or API keys;
- exploitable security details;
- private customer payloads or endpoints;
- production incident data;
- requests to debug proprietary third-party integrations containing confidential material.

Security concerns should follow [`SECURITY.md`](SECURITY.md).

## Scope

The project provides reusable patterns and reference adapters. It does not include SLA-backed support, managed hosting, vendor-specific credentials, production persistence or a production operations control plane.

When asking for help, provide a minimal fictional reproduction, the Node/npm versions, relevant configuration with secrets removed, and the output of `npm run verify` when applicable.
