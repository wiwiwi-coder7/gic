import { readFile, writeFile } from "node:fs/promises";

const query = await readFile(new URL("../supabase/migrations/20260815_independent_gic.sql", import.meta.url), "utf8");
await writeFile("/tmp/gic-independent-migration.json", JSON.stringify({
  project_id: "qqafgmkxqzjpppczzrac",
  name: "create_isolated_gic_schema",
  query,
}));
