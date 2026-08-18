export type AppConfig = {
  serviceName: string;
  host: string;
  port: number;
  logLevel: string;
  webhookSigningSecret: string | null;
  webhookMaxAgeSeconds: number;
  exposeAuditApi: boolean;
};

function parsePort(value: string | undefined): number {
  if (!value) return 3001;
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parsePositiveInteger(value: string | undefined, fallback: number, field: string): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean, field: string): boolean {
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${field} must be true or false`);
}

export function loadConfig(): AppConfig {
  return {
    serviceName: process.env.SERVICE_NAME?.trim() || "Integration Gateway",
    host: process.env.HOST?.trim() || "127.0.0.1",
    port: parsePort(process.env.PORT),
    logLevel: process.env.LOG_LEVEL?.trim() || "info",
    webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET?.trim() || null,
    webhookMaxAgeSeconds: parsePositiveInteger(
      process.env.WEBHOOK_MAX_AGE_SECONDS,
      300,
      "WEBHOOK_MAX_AGE_SECONDS"
    ),
    exposeAuditApi: parseBoolean(process.env.EXPOSE_AUDIT_API, false, "EXPOSE_AUDIT_API")
  };
}
