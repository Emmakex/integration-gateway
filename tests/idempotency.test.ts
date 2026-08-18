import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryIdempotencyRepository } from "../src/adapters/in-memory-idempotency-repository.ts";

test("claims, blocks concurrent work and replays completed keys", async () => {
  const repository = new InMemoryIdempotencyRepository();

  assert.deepEqual(await repository.claim("demo-key"), { status: "claimed" });
  assert.deepEqual(await repository.claim("demo-key"), { status: "in_progress" });

  await repository.complete("demo-key", "event-123");
  assert.deepEqual(await repository.claim("demo-key"), {
    status: "completed",
    eventId: "event-123"
  });
});

test("releases pending claims after failed processing", async () => {
  const repository = new InMemoryIdempotencyRepository();

  assert.deepEqual(await repository.claim("retryable-key"), { status: "claimed" });
  await repository.release("retryable-key");
  assert.deepEqual(await repository.claim("retryable-key"), { status: "claimed" });
});
