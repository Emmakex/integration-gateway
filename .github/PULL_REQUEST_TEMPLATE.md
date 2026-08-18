## Summary

Describe the change and the integration problem it solves.

## Capability boundary

Which area changes?

- [ ] inbound webhooks
- [ ] outbound REST
- [ ] SOAP/XML
- [ ] background jobs / replay
- [ ] persistence / observability
- [ ] documentation / CI / maintenance

## Security and reliability

- [ ] No credentials, customer endpoints or production payloads are included.
- [ ] Retry/idempotency semantics are explicit where applicable.
- [ ] External destinations remain server-controlled.
- [ ] New environment variables are documented with safe defaults.
- [ ] Security-sensitive behavior has tests.

## Validation

- [ ] `npm run verify`
- [ ] `npm audit --audit-level=high`
- [ ] Documentation updated if behavior/configuration changed.

## Production boundary

Explain whether this change affects the production checklist, persistence requirements, operational endpoints or trust boundaries.
