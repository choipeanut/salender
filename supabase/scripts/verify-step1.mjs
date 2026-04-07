import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const workspaceRoot = process.cwd();
const migrationDir = join(workspaceRoot, "supabase", "migrations");
const seedPath = join(workspaceRoot, "supabase", "seed.sql");

const migrationFile = readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .at(-1);

if (!migrationFile) {
  console.error("STEP1 verification failed: no migration SQL file found in supabase/migrations.");
  process.exit(1);
}

const migrationPath = join(migrationDir, migrationFile);
const migrationSql = readFileSync(migrationPath, "utf8");
const seedSql = readFileSync(seedPath, "utf8");

const requiredTables = [
  "brands",
  "brand_sources",
  "sale_events",
  "sale_event_snapshots",
  "user_brand_subscriptions",
  "user_devices",
  "notifications",
  "sync_runs",
  "sync_errors"
];

const requiredForeignKeyPatterns = [
  /references\s+public\.brands\(id\)/i,
  /references\s+public\.brand_sources\(id\)/i,
  /references\s+public\.sale_events\(id\)/i,
  /references\s+auth\.users\(id\)/i
];

const requiredPolicyPatterns = [
  /create\s+policy\s+brands_read_all/i,
  /create\s+policy\s+sale_events_read_all/i,
  /create\s+policy\s+user_brand_subscriptions_self_access/i,
  /create\s+policy\s+user_devices_self_access/i,
  /create\s+policy\s+notifications_self_read/i,
  /create\s+policy\s+notifications_self_update/i
];

const errors = [];

for (const table of requiredTables) {
  const createTableRegex = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`,
    "i"
  );
  if (!createTableRegex.test(migrationSql)) {
    errors.push(`Missing table definition: public.${table}`);
  }
}

for (const fkPattern of requiredForeignKeyPatterns) {
  if (!fkPattern.test(migrationSql)) {
    errors.push(`Missing expected foreign key pattern: ${String(fkPattern)}`);
  }
}

for (const policyPattern of requiredPolicyPatterns) {
  if (!policyPattern.test(migrationSql)) {
    errors.push(`Missing expected RLS policy: ${String(policyPattern)}`);
  }
}

const expectedBrandSlugs = ["oliveyoung", "musinsa", "zara", "uniqlo"];
for (const slug of expectedBrandSlugs) {
  if (!new RegExp(`'${slug}'`, "i").test(seedSql)) {
    errors.push(`Seed missing brand slug: ${slug}`);
  }
}

const saleEventsInsertBlockMatch = seedSql.match(
  /insert\s+into\s+public\.sale_events[\s\S]*?values([\s\S]*?)on\s+conflict\s+\(source_id,\s*external_id\)/i
);
const snapshotsInsertBlockMatch = seedSql.match(
  /insert\s+into\s+public\.sale_event_snapshots[\s\S]*?values([\s\S]*?)on\s+conflict\s+\(sale_event_id,\s*snapshot_hash\)/i
);

const saleEventsInsertBlock = saleEventsInsertBlockMatch?.[1] ?? "";
const snapshotsInsertBlock = snapshotsInsertBlockMatch?.[1] ?? "";

const saleEventIdMatches = saleEventsInsertBlock.match(
  /'00000000-0000-0000-0000-00000000030[1-9]'/g
) ?? [];
if (saleEventIdMatches.length < 4) {
  errors.push(`Seed has too few sale_events. Expected >= 4, got ${saleEventIdMatches.length}`);
}

const snapshotIdMatches = snapshotsInsertBlock.match(
  /'00000000-0000-0000-0000-00000000040[1-9]'/g
) ?? [];
if (snapshotIdMatches.length < 1) {
  errors.push("Seed has no sale_event_snapshots rows.");
}

if (!/on\s+conflict\s+\(slug\)/i.test(seedSql)) {
  errors.push("Seed should be idempotent for brands (missing ON CONFLICT(slug)).");
}

if (!/on\s+conflict\s+\(source_id,\s*external_id\)/i.test(seedSql)) {
  errors.push("Seed should be idempotent for sale_events (missing ON CONFLICT(source_id, external_id)).");
}

if (errors.length > 0) {
  console.error("STEP1 verification failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("STEP1 verification passed.");
console.log(`- Migration file: ${migrationFile}`);
console.log(`- Verified tables: ${requiredTables.length}`);
console.log(`- Seed brands: ${expectedBrandSlugs.length}`);
console.log(`- Seed sale_events: ${saleEventIdMatches.length}`);
console.log(`- Seed snapshots: ${snapshotIdMatches.length}`);
