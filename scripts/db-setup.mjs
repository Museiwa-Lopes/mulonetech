import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const { Client } = pg;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

async function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore when .env.local does not exist
  }
}

await loadLocalEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL nao definido.");
  process.exit(1);
}

const schemaPath = path.resolve(process.cwd(), "lib/db/schema.sql");
const schemaSql = await readFile(schemaPath, "utf8");

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(schemaSql);

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim();

  if (adminEmail && adminPassword) {
    await client.query(
      `insert into admin_users (email, password_hash, role, is_active, updated_at)
       values ($1, $2, 'admin', true, now())
       on conflict (email) do update
       set password_hash = excluded.password_hash,
           role = excluded.role,
           is_active = true,
           updated_at = now()`,
      [adminEmail, hashPassword(adminPassword)]
    );
    console.log("Utilizador admin sincronizado em admin_users.");
  }

  await client.query(
    `insert into app_settings (key, value)
     values ('system', '{"provider":"postgresql","version":1}'::jsonb)
     on conflict (key) do update
     set value = excluded.value, updated_at = now()`
  );

  console.log("Schema PostgreSQL aplicado com sucesso.");
} catch (error) {
  console.error("Falha ao aplicar schema:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
