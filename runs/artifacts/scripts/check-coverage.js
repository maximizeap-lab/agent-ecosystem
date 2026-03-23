#!/usr/bin/env node
/**
 * scripts/check-coverage.js
 *
 * Reads coverage/coverage-summary.json and enforces minimum thresholds.
 * Exits with code 1 if any threshold is violated.
 */

const fs = require("fs");
const path = require("path");

// ── Thresholds (%) ────────────────────────────────────────────────
const THRESHOLDS = {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
};

// ── Read coverage summary ─────────────────────────────────────────
const summaryPath = path.resolve(process.cwd(), "coverage/coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  console.error("❌  coverage/coverage-summary.json not found.");
  console.error("    Run `pnpm test:unit --coverage` first.");
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const total = summary.total;

if (!total) {
  console.error("❌  No 'total' key found in coverage summary.");
  process.exit(1);
}

// ── Compare & report ─────────────────────────────────────────────
let passed = true;
const rows = [];

for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
  const actual = total[metric]?.pct ?? 0;
  const ok = actual >= threshold;
  if (!ok) passed = false;
  rows.push({ metric, actual: actual.toFixed(2), threshold, status: ok ? "✅" : "❌" });
}

console.log("\n📊  Coverage Thresholds\n");
console.log(
  "  Metric      Actual    Threshold  Status"
);
console.log("  ─────────────────────────────────────");
for (const row of rows) {
  console.log(
    `  ${row.metric.padEnd(12)}${String(row.actual + "%").padEnd(10)}${String(row.threshold + "%").padEnd(11)}${row.status}`
  );
}
console.log();

if (!passed) {
  console.error("❌  Coverage thresholds NOT met. Fix failing coverage before merging.\n");
  process.exit(1);
} else {
  console.log("✅  All coverage thresholds met.\n");
}
