import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [index, deno] = await Promise.all([
  readFile(new URL("supabase/functions/gic-api/index.ts", root), "utf8"),
  readFile(new URL("supabase/functions/gic-api/deno.json", root), "utf8"),
]);
await writeFile("/tmp/gic-api-deploy.json", JSON.stringify({
  project_id: "qqafgmkxqzjpppczzrac",
  name: "gic-api",
  verify_jwt: false,
  entrypoint_path: "index.ts",
  import_map_path: "deno.json",
  files: [{ name: "index.ts", content: index }, { name: "deno.json", content: deno }],
}));
