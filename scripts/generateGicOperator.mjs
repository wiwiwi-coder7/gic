import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";

const identifier = `GIC-${randomBytes(4).toString("hex").toUpperCase()}`;
const password = `${randomBytes(5).toString("base64url")}-Cedar-Runway`;
const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
await mkdir("/home/ubuntu/secure", { recursive: true });
await writeFile("/home/ubuntu/secure/gic-operator-credentials.txt", `GIC operator credentials\nIdentifier: ${identifier}\nPassword: ${password}\n`);
await writeFile("/tmp/gic-operator.json", JSON.stringify({ identifier, passwordHash }));
