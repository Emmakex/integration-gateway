import type { OutboundFailure } from "../domain/outbound.ts";

export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export function classifyHttpFailure(statusCode: number): OutboundFailure {
  if (statusCode === 408) {
    return { kind: "timeout", retryable: true, message: "Remote request timed out", statusCode };
  }
  if (statusCode === 429) {
    return { kind: "rate_limited", retryable: true, message: "Remote service rate limited the request", statusCode };
  }
  if (statusCode >= 500) {
    return { kind: "server", retryable: true, message: "Remote service returned a server error", statusCode };
  }
  if (statusCode >= 400) {
    return { kind: "client", retryable: false, message: "Remote service rejected the request", statusCode };
  }
  return { kind: "invalid_response", retryable: false, message: "Unexpected remote response status", statusCode };
}

export function computeRetryDelayMs(attempt: number, policy: RetryPolicy): number {
  const exponent = Math.max(attempt - 1, 0);
  return Math.min(policy.baseDelayMs * 2 ** exponent, policy.maxDelayMs);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
