import type {
  OutboundFailure,
  OutboundRequest,
  OutboundResult
} from "../domain/outbound.ts";
import type { OutboundConnector } from "../repositories/outbound-connector.ts";
import {
  classifyHttpFailure,
  computeRetryDelayMs,
  sleep,
  type RetryPolicy
} from "../reliability/retry-policy.ts";

type FetchLike = typeof fetch;
type SleepFn = (ms: number) => Promise<void>;

type RestOutboundConnectorOptions = {
  baseUrl: string;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  fetchFn?: FetchLike;
  sleepFn?: SleepFn;
};

type AttemptResult =
  | { ok: true; statusCode: number; body: unknown; retryAfterMs?: number }
  | { ok: false; failure: OutboundFailure; retryAfterMs?: number };

function isNaturallyIdempotent(method: OutboundRequest["method"]): boolean {
  return method === "GET" || method === "PUT" || method === "DELETE";
}

function retryAfterMilliseconds(value: string | null, nowMs = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number.parseInt(value, 10);
  if (Number.isInteger(seconds) && seconds >= 0) return seconds * 1000;

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.max(dateMs - nowMs, 0);
}

function timeoutFailure(): OutboundFailure {
  return { kind: "timeout", retryable: true, message: "Outbound request timed out" };
}

function networkFailure(): OutboundFailure {
  return { kind: "network", retryable: true, message: "Outbound network request failed" };
}

export class RestOutboundConnector implements OutboundConnector {
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;
  private readonly fetchFn: FetchLike;
  private readonly sleepFn: SleepFn;

  constructor(options: RestOutboundConnectorOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      throw new Error("Outbound base URL must use http or https");
    }
    if (baseUrl.username || baseUrl.password) {
      throw new Error("Outbound base URL must not embed credentials");
    }
    if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
      throw new Error("Outbound timeout must be a positive integer");
    }
    if (!Number.isInteger(options.retryPolicy.maxAttempts) || options.retryPolicy.maxAttempts < 1) {
      throw new Error("Retry maxAttempts must be a positive integer");
    }

    this.baseUrl = baseUrl;
    this.timeoutMs = options.timeoutMs;
    this.retryPolicy = options.retryPolicy;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleepFn = options.sleepFn ?? sleep;
  }

  async send(request: OutboundRequest): Promise<OutboundResult> {
    if (!request.path.startsWith("/") || request.path.startsWith("//") || request.path.includes("://")) {
      return {
        ok: false,
        attempts: 0,
        failure: {
          kind: "configuration",
          retryable: false,
          message: "Outbound path must be a relative absolute-path reference"
        }
      };
    }

    const mayRetry = isNaturallyIdempotent(request.method) || Boolean(request.idempotencyKey?.trim());

    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt += 1) {
      const result = await this.attempt(request);
      if (result.ok) {
        return {
          ok: true,
          statusCode: result.statusCode,
          attempts: attempt,
          body: result.body
        };
      }

      if (!result.failure.retryable || attempt >= this.retryPolicy.maxAttempts) {
        return { ok: false, attempts: attempt, failure: result.failure };
      }

      if (!mayRetry) {
        return {
          ok: false,
          attempts: attempt,
          failure: {
            ...result.failure,
            retryable: false,
            message: `${result.failure.message}; automatic retry suppressed for a non-idempotent request without an idempotency key`
          }
        };
      }

      const exponentialDelay = computeRetryDelayMs(attempt, this.retryPolicy);
      const delay = Math.min(
        result.retryAfterMs ?? exponentialDelay,
        this.retryPolicy.maxDelayMs
      );
      await this.sleepFn(delay);
    }

    return {
      ok: false,
      attempts: this.retryPolicy.maxAttempts,
      failure: { kind: "network", retryable: false, message: "Retry loop terminated unexpectedly" }
    };
  }

  private async attempt(request: OutboundRequest): Promise<AttemptResult> {
    const target = new URL(request.path, this.baseUrl);
    if (target.origin !== this.baseUrl.origin) {
      return {
        ok: false,
        failure: { kind: "configuration", retryable: false, message: "Outbound path changed target origin" }
      };
    }

    const headers = new Headers({
      accept: "application/json",
      "x-correlation-id": request.correlationId
    });
    if (request.body) headers.set("content-type", "application/json");
    if (request.idempotencyKey?.trim()) headers.set("idempotency-key", request.idempotencyKey.trim());

    try {
      const response = await this.fetchFn(target, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: "error"
      });

      const text = await response.text();
      let body: unknown = null;
      if (text) {
        if (response.headers.get("content-type")?.includes("application/json")) {
          try {
            body = JSON.parse(text);
          } catch {
            return {
              ok: false,
              failure: {
                kind: "invalid_response",
                retryable: false,
                message: "Remote service declared JSON but returned invalid JSON",
                statusCode: response.status
              }
            };
          }
        } else {
          body = text;
        }
      }

      if (response.ok) {
        return { ok: true, statusCode: response.status, body };
      }

      const retryAfterMs = retryAfterMilliseconds(response.headers.get("retry-after"));
      const failure = classifyHttpFailure(response.status);
      return retryAfterMs === undefined
        ? { ok: false, failure }
        : { ok: false, failure, retryAfterMs };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      return {
        ok: false,
        failure: name === "TimeoutError" || name === "AbortError"
          ? timeoutFailure()
          : networkFailure()
      };
    }
  }
}
