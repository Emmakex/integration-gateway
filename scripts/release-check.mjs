import { access, readFile } from "node:fs/promises";

const failures = [];
const requiredFiles = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "SUPPORT.md",
  "ROADMAP.md",
  ".env.example",
  "package-lock.json",
  "docs/README.md",
  "docs/ARCHITECTURE.md",
  "docs/WEBHOOKS.md",
  "docs/OUTBOUND-REST.md",
  "docs/SOAP-XML.md",
  "docs/JOBS.md",
  "docs/OPERATIONS.md",
  "docs/ADAPTER-GUIDE.md",
  "docs/DEPLOYMENT.md",
  "docs/PRODUCTION-CHECKLIST.md"
];

for (const path of requiredFiles) {
  try {
    await access(path);
  } catch {
    failures.push(`missing required release file: ${path}`);
  }
}

const pkg = JSON.parse(await readFile("package.json", "utf8"));

if (pkg.name !== "integration-gateway") failures.push("package name must be integration-gateway");
if (pkg.version !== "1.0.0") failures.push("package version must be 1.0.0");
if (pkg.license !== "MIT") failures.push("package license must be MIT");
if (pkg.private !== true) failures.push("package must remain private=true to prevent accidental npm publication");
if (pkg.packageManager !== "npm@11.17.0") failures.push("packageManager must be pinned to npm@11.17.0");
if (pkg.engines?.node !== ">=24.12 <25") failures.push("Node engine must remain >=24.12 <25");
if (pkg.engines?.npm !== ">=11 <12") failures.push("npm engine must remain >=11 <12");

for (const [groupName, group] of Object.entries({
  dependencies: pkg.dependencies ?? {},
  devDependencies: pkg.devDependencies ?? {}
})) {
  for (const [name, version] of Object.entries(group)) {
    if (typeof version !== "string" || /[~^*xX><|\s]/.test(version)) {
      failures.push(`${groupName}.${name} must use an exact version`);
    }
  }
}

for (const script of ["check:safety", "check:release", "test", "smoke", "typecheck", "build", "verify"]) {
  if (!pkg.scripts?.[script]) failures.push(`missing npm script: ${script}`);
}

try {
  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  if (lock.lockfileVersion !== 3) failures.push("package-lock.json must use lockfileVersion 3");
  if (lock.name !== pkg.name) failures.push("package-lock.json name must match package.json");
  if (lock.version !== pkg.version) failures.push("package-lock.json version must match package.json");
  if (lock.packages?.[""]?.version !== pkg.version) failures.push("lockfile root package version must match package.json");
} catch {
  failures.push("package-lock.json must be valid JSON");
}

const envExample = await readFile(".env.example", "utf8");
const requiredSafeDefaults = [
  "WEBHOOK_SIGNING_SECRET=",
  "EXPOSE_AUDIT_API=false",
  "OUTBOUND_BASE_URL=",
  "SOAP_ENDPOINT=",
  "JOB_WORKER_ENABLED=false",
  "ENABLE_DEMO_API=false",
  "ENABLE_DEMO_TARGET=false"
];
for (const expected of requiredSafeDefaults) {
  if (!envExample.includes(expected)) failures.push(`unsafe or missing .env.example default: ${expected}`);
}

const readme = await readFile("README.md", "utf8");
if (!readme.includes("version-1.0.0")) failures.push("README version badge must be 1.0.0");
if (!readme.includes("Production boundary")) failures.push("README must document the production boundary");
if (!readme.includes("MIT")) failures.push("README must mention the MIT license");

const changelog = await readFile("CHANGELOG.md", "utf8");
if (!changelog.includes("## [1.0.0]")) failures.push("CHANGELOG must include a 1.0.0 entry");

if (failures.length > 0) {
  console.error("Release readiness check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Release readiness check passed for Integration Gateway 1.0.0.");
