import assert from "node:assert/strict";
import test from "node:test";
import { classifyHttpFailure, computeRetryDelayMs } from "../src/reliability/retry-policy.ts";

const policy = {
  maxAttempts: 4,
  baseDelayMs: 100,
  maxDelayMs: 250
};

test("classifies transient HTTP failures as retryable", () => {
  assert.equal(classifyHttpFailure(408).retryable, true);
  assert.equal(classifyHttpFailure(429).retryable, true);
  assert.equal(classifyHttpFailure(503).retryable, true);
  assert.equal(classifyHttpFailure(503).kind, "server");
});

test("classifies ordinary 4xx failures as permanent", () => {
  const failure = classifyHttpFailure(400);
  assert.equal(failure.retryable, false);
  assert.equal(failure.kind, "client");
});

test("uses capped exponential retry delays", () => {
  assert.equal(computeRetryDelayMs(1, policy), 100);
  assert.equal(computeRetryDelayMs(2, policy), 200);
  assert.equal(computeRetryDelayMs(3, policy), 250);
  assert.equal(computeRetryDelayMs(4, policy), 250);
});
