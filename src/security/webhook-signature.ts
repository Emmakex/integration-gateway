import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookSignatureVerification =
  | { valid: true }
  | { valid: false; reason: string };

export type VerifyWebhookSignatureInput = {
  rawBody: string;
  timestamp: string;
  signature: string;
  secret: string;
  maxAgeSeconds: number;
  nowMs?: number;
};

export function verifyWebhookSignature(input: VerifyWebhookSignatureInput): WebhookSignatureVerification {
  const timestampSeconds = Number.parseInt(input.timestamp, 10);
  if (!Number.isInteger(timestampSeconds) || timestampSeconds <= 0) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const age = nowSeconds - timestampSeconds;
  if (age > input.maxAgeSeconds) {
    return { valid: false, reason: "stale_timestamp" };
  }
  if (age < -60) {
    return { valid: false, reason: "future_timestamp" };
  }

  const match = /^v1=([a-f0-9]{64})$/i.exec(input.signature.trim());
  if (!match?.[1]) {
    return { valid: false, reason: "invalid_signature_format" };
  }

  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.rawBody}`, "utf8")
    .digest("hex");

  const receivedBuffer = Buffer.from(match[1].toLowerCase(), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: "invalid_signature" };
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer)
    ? { valid: true }
    : { valid: false, reason: "invalid_signature" };
}
