import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { RestOutboundConnector } from "../src/adapters/rest-outbound-connector.ts";

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP server address");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("retries transient POST failures when an idempotency key is present", async () => {
  let attempts = 0;
  const server = createServer((_request, response) => {
    attempts += 1;
    response.setHeader("content-type", "application/json");
    if (attempts < 3) {
      response.statusCode = 503;
      response.end(JSON.stringify({ ok: false, attempt: attempts }));
      return;
    }
    response.end(JSON.stringify({ ok: true, attempt: attempts }));
  });

  const baseUrl = await listen(server);
  try {
    const connector = new RestOutboundConnector({
      baseUrl,
      timeoutMs: 1000,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
      sleepFn: async () => {}
    });

    const result = await connector.send({
      method: "POST",
      path: "/contacts",
      correlationId: "test-correlation",
      idempotencyKey: "test-idempotency",
      body: { contactId: "demo-123" }
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.attempts, 3);
    assert.deepEqual(result.body, { ok: true, attempt: 3 });
    assert.equal(attempts, 3);
  } finally {
    await close(server);
  }
});

test("does not retry non-idempotent POST without an idempotency key", async () => {
  let attempts = 0;
  const server = createServer((_request, response) => {
    attempts += 1;
    response.statusCode = 503;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: false }));
  });

  const baseUrl = await listen(server);
  try {
    const connector = new RestOutboundConnector({
      baseUrl,
      timeoutMs: 1000,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
      sleepFn: async () => {}
    });

    const result = await connector.send({
      method: "POST",
      path: "/contacts",
      correlationId: "test-correlation",
      body: { contactId: "demo-123" }
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.attempts, 1);
    assert.equal(result.failure.retryable, false);
    assert.equal(result.failure.kind, "server");
    assert.match(result.failure.message, /retry suppressed/i);
    assert.equal(attempts, 1);
  } finally {
    await close(server);
  }
});

test("does not retry permanent client errors", async () => {
  let attempts = 0;
  const server = createServer((_request, response) => {
    attempts += 1;
    response.statusCode = 400;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: "invalid_input" }));
  });

  const baseUrl = await listen(server);
  try {
    const connector = new RestOutboundConnector({
      baseUrl,
      timeoutMs: 1000,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
      sleepFn: async () => {}
    });

    const result = await connector.send({
      method: "POST",
      path: "/contacts",
      correlationId: "test-correlation",
      idempotencyKey: "test-idempotency",
      body: { contactId: "demo-123" }
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.attempts, 1);
    assert.equal(result.failure.kind, "client");
    assert.equal(result.failure.retryable, false);
    assert.equal(attempts, 1);
  } finally {
    await close(server);
  }
});
