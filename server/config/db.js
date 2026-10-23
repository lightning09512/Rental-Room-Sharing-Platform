import mongoose from "mongoose"
import pg from "pg"

const { Pool } = pg
// Keep PostgreSQL DATE values as YYYY-MM-DD so contract dates do not shift with the server timezone.
pg.types.setTypeParser(1082, (value) => value)

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 })
  : null

export async function connectMongo() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured")
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 })
}

export async function databaseStatus() {
  const status = { postgres: "not_configured", mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }
  if (pool) {
    try { await pool.query("SELECT 1"); status.postgres = "connected" }
    catch { status.postgres = "disconnected" }
  }
  return status
}

export function requirePostgres(_req, res, next) {
  if (!pool) return res.status(503).json({ error: "PostgreSQL chưa được cấu hình.", code: "DATABASE_UNAVAILABLE" })
  next()
}

export function requireMongo(_req, res, next) {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "MongoDB chưa kết nối.", code: "DATABASE_UNAVAILABLE" })
  next()
}
