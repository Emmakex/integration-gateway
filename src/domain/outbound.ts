export type OutboundFailureKind =
  | "configuration"
  | "network"
  | "timeout"
  | "rate_limited"
  | "server"
  | "client"
  | "invalid_response";

export type OutboundFailure = {
  kind: OutboundFailureKind;
  retryable: boolean;
  message: string;
  statusCode?: number;
};

export type OutboundRequest = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  correlationId: string;
  body?: Record<string, unknown>;
};

export type OutboundSuccess = {
  ok: true;
  statusCode: number;
  attempts: number;
  body: unknown;
};

export type OutboundError = {
  ok: false;
  attempts: number;
  failure: OutboundFailure;
};

export type OutboundResult = OutboundSuccess | OutboundError;
