import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyWebhookSignature } from "../src/security/webhook-signature.ts";

const secret = "test-signing-key";
const rawBody = '{"contactId":"demo-123"}';
const timestamp = "2000000000";
const nowMs = 2_000_000_000_000;

function signatureFor(body: string, time: string): string {
  const digest = createHmac("sha256", secret)
    .update(`${time}.${body}`, "utf8")
    .digest("hex");
  return `v1=${digest}`;
}

test("accepts a valid timestamped HMAC", () => {
  assert.deepEqual(
    verifyWebhookSignature({
      rawBody,
      timestamp,
      signature: signatureFor(rawBody, timestamp),
      secret,
      maxAgeSeconds: 300,
      nowMs
    }),
    { valid: true }
  );
});

test("rejects an invalid signature", () => {
  const result = verifyWebhookSignature({
    rawBody,
    timestamp,
    signature: `v1=${"0".repeat(64)}`,
    secret,
    maxAgeSeconds: 300,
    nowMs
  });
  assert.deepEqual(result, { valid: false, reason: "invalid_signature" });
});

test("rejects stale webhook timestamps", () => {
  const oldTimestamp = "1999999000";
  const result = verifyWebhookSignature({
    rawBody,
    timestamp: oldTimestamp,
    signature: signatureFor(rawBody, oldTimestamp),
    secret,
    maxAgeSeconds: 300,
    nowMs
  });
  assert.deepEqual(result, { valid: false, reason: "stale_timestamp" });
});
