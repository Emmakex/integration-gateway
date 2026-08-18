import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src"];
const findings = [];
const textExtensions = new Set([".ts", ".js", ".mjs", ".json"]);

const rules = [
  { name: "debug logging", pattern: /console\.(log|debug)\s*\(/ },
  { name: "dynamic code execution", pattern: /\b(eval|Function)\s*\(/ },
  { name: "hardcoded bearer token", pattern: /Bearer\s+[A-Za-z0-9._~+\/-]{16,}/i },
  { name: "private key material", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "hardcoded external endpoint", pattern: /https?:\/\/(?!127\.0\.0\.1|localhost)/i }
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!textExtensions.has(extname(path))) continue;
    const content = await readFile(path, "utf8");
    for (const rule of rules) {
      if (rule.pattern.test(content)) findings.push(`${path}: ${rule.name}`);
    }
  }
}

for (const root of roots) await walk(root);

if (findings.length) {
  console.error("Public source safety check failed:\n");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Public source safety check passed.");
