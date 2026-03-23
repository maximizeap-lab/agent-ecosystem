#!/usr/bin/env node
/**
 * scripts/merge-coverage.js
 *
 * Merges multiple sharded Istanbul/NYC coverage reports into one.
 * Reads from coverage-shards/coverage-shard-*/coverage-final.json
 * and writes merged reports to coverage/.
 */

const fs = require("fs");
const path = require("path");
const { createCoverageMap } = require("istanbul-lib-coverage");
const { createContext } = require("istanbul-lib-report");
const reports = require("istanbul-reports");

const SHARDS_DIR = path.resolve(process.cwd(), "coverage-shards");
const OUTPUT_DIR = path.resolve(process.cwd(), "coverage");

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Collect all shard coverage files
const shardDirs = fs.readdirSync(SHARDS_DIR).filter((d) =>
  fs.statSync(path.join(SHARDS_DIR, d)).isDirectory()
);

if (shardDirs.length === 0) {
  console.error("❌  No shard directories found in", SHARDS_DIR);
  process.exit(1);
}

const map = createCoverageMap({});

for (const dir of shardDirs) {
  const jsonPath = path.join(SHARDS_DIR, dir, "coverage-final.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️  Skipping ${dir}: no coverage-final.json found`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  map.merge(data);
  console.log(`✅  Merged shard: ${dir}`);
}

// Generate reports
const context = createContext({
  dir: OUTPUT_DIR,
  coverageMap: map,
  watermarks: {
    statements: [50, 80],
    functions: [50, 80],
    branches: [50, 75],
    lines: [50, 80],
  },
});

const reportTypes = ["lcovonly", "json", "json-summary", "text", "html"];
for (const type of reportTypes) {
  reports.create(type).execute(context);
}

console.log(`\n📊  Merged coverage reports written to ${OUTPUT_DIR}`);
