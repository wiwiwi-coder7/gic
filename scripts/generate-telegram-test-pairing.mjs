import { tsImport } from "tsx/esm/api";
import { eq } from "drizzle-orm";

const { createTelegramPairing, getDb } = await tsImport("../server/db.ts", import.meta.url);
const { users } = await tsImport("../drizzle/schema.ts", import.meta.url);
const db = await getDb();
if (!db) throw new Error("Fix database is unavailable.");
try {
  const [owner] = await db.select().from(users).where(eq(users.role, "owner")).limit(1);
  if (!owner) throw new Error("No Fix owner account is available.");
  const pairing = await createTelegramPairing({ userId: owner.id, roleSnapshot: "owner" });
  console.log(JSON.stringify({ pairingPublicId: pairing.publicId, code: pairing.code, expiresAt: pairing.expiresAt }));
} finally {
  await db.$client.end();
}
