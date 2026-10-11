import "dotenv/config"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run migrations.")
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(currentDir, "../database/migrations")
const migrationNames = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort()
const client = await pool.connect()
try {
  await client.query("BEGIN")
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())")
  for (const name of migrationNames) {
    const alreadyApplied = await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [name])
    if (alreadyApplied.rowCount) {
      console.log(`Migration ${name} already applied`)
      continue
    }
    const sql = await readFile(path.resolve(migrationsDir, name), "utf8")
    await client.query(sql)
    await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [name])
    console.log(`Applied migration ${name}`)
  }
  await client.query("COMMIT")
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  client.release()
  await pool.end()
}
