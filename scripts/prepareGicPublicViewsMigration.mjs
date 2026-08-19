import { writeFile } from "node:fs/promises";

const tables = [
  "users", "projects", "project_tasks", "approval_gates", "approval_decisions", "agent_runs",
  "project_events", "notifications", "site_profiles", "web_actions", "provider_models",
  "provider_credentials", "telegram_pairings", "telegram_preferences", "digest_runs",
  "fallback_test_runs", "operator_config", "operator_sessions",
];
const sql = [
  "create schema if not exists public;",
  ...tables.map(table => `create or replace view public.gic_${table} with (security_invoker = false) as select * from gic.${table};`),
  ...tables.map(table => `grant select, insert, update, delete on public.gic_${table} to service_role;`),
].join("\n");
await writeFile("/tmp/gic-public-views-migration.json", JSON.stringify({ project_id: "qqafgmkxqzjpppczzrac", name: "gic_public_api_views", query: sql }));
