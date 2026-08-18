import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const findings = [];
const roots = ["src", "tests", "scripts"];
const textExtensions = new Set([".ts", ".js", ".mjs", ".cjs", ".json"]);

const allowedUrlPrefixes = [
  "http://schemas.xmlsoap.org/soap/envelope/",
  "http://www.w3.org/2003/05/soap-envelope",
  "http://127.0.0.1",
  "https://127.0.0.1",
  "http://localhost",
  "https://localhost"
];

const sharedRules = [
  { name: "dynamic code execution", pattern: /\b(eval|Function)\s*\(/ },
  { name: "hardcoded bearer token", pattern: /Bearer\s+[A-Za-z0-9._~+\/-]{16,}/i },
  { name: "private key material", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key pattern", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "JWT-like credential", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: "embedded URL credentials", pattern: /https?:\/\/[^\s/:@]+:[^\s/@]+@/i },
  { name: "TLS verification disabled", pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|rejectUnauthorized\s*:\s*false/i }
];

async function scanFile(path) {
  if (!textExtensions.has(extname(path))) return;
  const content = await readFile(path, "utf8");

  for (const rule of sharedRules) {
    if (rule.pattern.test(content)) findings.push(`${path}: ${rule.name}`);
  }

  if (path === "src" || path.startsWith("src/")) {
    if (/console\.(log|debug)\s*\(/.test(content)) findings.push(`${path}: debug logging`);
    if (/\bdebugger\s*;/.test(content)) findings.push(`${path}: debugger statement`);
  }

  const endpointScanContent = allowedUrlPrefixes.reduce(
    (value, url) => value.replaceAll(url, "ALLOWED_URL"),
    content
  );
  if (/https?:\/\//i.test(endpointScanContent)) {
    findings.push(`${path}: hardcoded external endpoint`);
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    await scanFile(relative(".", path));
  }
}

for (const root of roots) await walk(root);

const rootEntries = await readdir(".", { withFileTypes: true });
for (const entry of rootEntries) {
  if (!entry.isFile()) continue;
  if (entry.name.startsWith(".env") && entry.name !== ".env.example") {
    findings.push(`${entry.name}: environment file must not be tracked`);
  }
}

if (findings.length) {
  console.error("Public source safety check failed:\n");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Public source safety check passed.");
