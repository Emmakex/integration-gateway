export type AppConfig = {
  serviceName: string;
  host: string;
  port: number;
  logLevel: string;
};

function parsePort(value: string | undefined): number {
  if (!value) return 3001;
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

export function loadConfig(): AppConfig {
  return {
    serviceName: process.env.SERVICE_NAME?.trim() || "Integration Gateway",
    host: process.env.HOST?.trim() || "127.0.0.1",
    port: parsePort(process.env.PORT),
    logLevel: process.env.LOG_LEVEL?.trim() || "info"
  };
}
