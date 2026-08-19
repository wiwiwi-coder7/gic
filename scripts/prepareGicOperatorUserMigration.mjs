import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const credential = JSON.parse(await readFile("/tmp/gic-operator.json", "utf8"));
const userId = randomUUID();
const query = `
alter table gic.users drop constraint if exists users_id_fkey;
alter table gic.operator_config add column if not exists user_id uuid;
insert into gic.users(id, display_name, role) values ('${userId}', 'GIC Operator', 'owner') on conflict (id) do nothing;
update gic.operator_config set user_id = '${userId}' where identifier = '${credential.identifier.replace(/'/g, "''")}';
alter table gic.operator_config alter column user_id set not null;
`;
await writeFile("/tmp/gic-operator-user-migration.json", JSON.stringify({ project_id: "qqafgmkxqzjpppczzrac", name: "create_gic_operator_user", query }));
await writeFile("/tmp/gic-operator-user.json", JSON.stringify({ userId }));
