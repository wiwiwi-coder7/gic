import { readFile, writeFile } from "node:fs/promises";

const [base, credentialText] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260815_gic_operator_sessions.sql", import.meta.url), "utf8"),
  readFile("/tmp/gic-operator.json", "utf8"),
]);
const credential = JSON.parse(credentialText);
const identifier = credential.identifier.replace(/'/g, "''");
const passwordHash = credential.passwordHash.replace(/'/g, "''");
const query = `${base}\ninsert into gic.operator_config(identifier, password_hash) values ('${identifier}', '${passwordHash}') on conflict (identifier) do update set password_hash = excluded.password_hash, updated_at = now();\n`;
await writeFile("/tmp/gic-operator-migration.json", JSON.stringify({ project_id: "qqafgmkxqzjpppczzrac", name: "create_gic_operator_sessions", query }));
