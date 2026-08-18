import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const baseUrl = process.env.SMOKE_BASE_URL?.trim() || "http://127.0.0.1:3001";
const signingSecret = process.env.WEBHOOK_SIGNING_SECRET?.trim();

if (!signingSecret) {
  throw new Error("WEBHOOK_SIGNING_SECRET is required for the HTTP smoke suite");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const endpoint = (path) => new URL(path, baseUrl).toString();

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  let body = options.body;
  if (body !== undefined && typeof body !== "string") {
    body = JSON.stringify(body);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
  }

  const response = await fetch(endpoint(path), {
    method: options.method ?? "GET",
    headers,
    body,
    redirect: "error"
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (options.status !== undefined) {
    assert.equal(response.status, options.status, `${options.method ?? "GET"} ${path}: ${text}`);
  } else {
    assert.ok(response.ok, `${options.method ?? "GET"} ${path}: ${response.status} ${text}`);
  }

  return parsed;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(endpoint("/health"), { redirect: "error" });
      if (response.ok) return;
    } catch {
      // Server may still be starting.
    }
    await sleep(250);
  }
  throw new Error("Integration Gateway did not become healthy in time");
}

await waitForHealth();

const ready = await request("/ready");
assert.equal(ready.checks.webhookSignature, "configured");
assert.equal(ready.checks.outboundConnector, "configured");
assert.equal(ready.checks.soapConnector, "configured");
assert.equal(ready.checks.jobWorker, "disabled");

const event = await request("/v1/integration-events", {
  method: "POST",
  status: 201,
  body: {
    source: "demo-crm",
    type: "contact.updated",
    payload: { contactId: "demo-123" }
  }
});
assert.equal(event.status, "accepted");

const webhookPayload = '{"contactId":"demo-webhook-456"}';
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = `v1=${createHmac("sha256", signingSecret)
  .update(`${timestamp}.${webhookPayload}`)
  .digest("hex")}`;
const webhookHeaders = {
  "content-type": "application/json",
  "x-integration-timestamp": timestamp,
  "x-integration-signature": signature,
  "x-idempotency-key": "ci-hook-1",
  "x-correlation-id": "ci-correlation-1"
};

const acceptedWebhook = await request("/v1/webhooks/demo-crm/contact.updated", {
  method: "POST",
  status: 202,
  headers: webhookHeaders,
  body: webhookPayload
});
assert.equal(acceptedWebhook.replayed, false);

const replayedWebhook = await request("/v1/webhooks/demo-crm/contact.updated", {
  method: "POST",
  status: 200,
  headers: webhookHeaders,
  body: webhookPayload
});
assert.equal(replayedWebhook.replayed, true);

const rejectedWebhook = await request("/v1/webhooks/demo-crm/contact.updated", {
  method: "POST",
  status: 401,
  headers: {
    ...webhookHeaders,
    "x-idempotency-key": "ci-hook-invalid",
    "x-integration-signature": `v1=${"0".repeat(64)}`
  },
  body: webhookPayload
});
assert.equal(rejectedWebhook.reason, "invalid_signature");

const webhookAudit = await request("/v1/webhook-audit");
assert.ok(webhookAudit.items.some((item) => item.outcome === "replayed"));
assert.ok(webhookAudit.items.some((item) => item.outcome === "rejected"));

const outbound = await request("/v1/demo/outbound", {
  method: "POST",
  body: {
    payload: { externalId: "demo-789" },
    idempotencyKey: "ci-outbound-1"
  }
});
assert.equal(outbound.ok, true);
assert.equal(outbound.attempts, 3);
assert.equal(outbound.body.attempt, 3);

const soapSuccess = await request("/v1/demo/soap", {
  method: "POST",
  body: { mode: "success" }
});
assert.equal(soapSuccess.ok, true);
assert.match(JSON.stringify(soapSuccess), /PingResponse/);

const soapFault = await request("/v1/demo/soap", {
  method: "POST",
  status: 502,
  body: { mode: "fault" }
});
assert.equal(soapFault.kind, "fault");
assert.match(JSON.stringify(soapFault), /Fictional demo fault/);

const retryJob = await request("/v1/demo/jobs", {
  method: "POST",
  status: 201,
  body: {
    mode: "eventual_success",
    failuresBeforeSuccess: 1,
    maxAttempts: 3,
    correlationId: "ci-job-retry"
  }
});

const firstJobAttempt = await request("/v1/demo/jobs/process", { method: "POST" });
assert.equal(firstJobAttempt.job.status, "retry_scheduled");
await sleep(25);
const secondJobAttempt = await request("/v1/demo/jobs/process", { method: "POST" });
assert.equal(secondJobAttempt.job.status, "succeeded");
const completedRetryJob = await request(`/v1/demo/jobs/${retryJob.id}`);
assert.equal(completedRetryJob.status, "succeeded");

const deadJob = await request("/v1/demo/jobs", {
  method: "POST",
  status: 201,
  body: {
    mode: "permanent_failure",
    maxAttempts: 3,
    correlationId: "ci-job-dlq"
  }
});
const deadProcessed = await request("/v1/demo/jobs/process", { method: "POST" });
assert.equal(deadProcessed.job.status, "dead_letter");

const replayJob = await request(`/v1/demo/jobs/${deadJob.id}/replay`, {
  method: "POST",
  status: 201
});
assert.notEqual(replayJob.id, deadJob.id);
assert.equal(replayJob.replayedFromJobId, deadJob.id);
const originalDeadJob = await request(`/v1/demo/jobs/${deadJob.id}`);
assert.equal(originalDeadJob.status, "dead_letter");

const metrics = await request("/v1/demo/job-metrics");
assert.equal(metrics.succeeded, 1);
assert.equal(metrics.deadLettered, 1);
assert.equal(metrics.replayed, 1);

console.log("Integration Gateway HTTP smoke suite passed.");
