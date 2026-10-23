import jwt from "jsonwebtoken"
import { pool } from "../config/db.js"

export function createToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    const error = new Error("JWT_SECRET cần có ít nhất 32 ký tự.")
    error.status = 503
    throw error
  }
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" })
}

export async function requireAuth(req, res, next) {
  const header = req.get("authorization") || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!token) return res.status(401).json({ error: "Vui lòng đăng nhập.", code: "AUTH_REQUIRED" })
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ error: "JWT_SECRET chưa được cấu hình an toàn.", code: "AUTH_NOT_CONFIGURED" })
  let claims
  try { claims = jwt.verify(token, process.env.JWT_SECRET) }
  catch {
    return res.status(401).json({ error: "Phiên đăng nhập hết hạn hoặc không hợp lệ.", code: "INVALID_TOKEN" })
  }
  if (!pool) return res.status(503).json({ error: "PostgreSQL chưa được cấu hình.", code: "DATABASE_UNAVAILABLE" })
  try {
    const result = await pool.query("SELECT id,role,email,status FROM users WHERE id=$1", [claims.sub])
    const account = result.rows[0]
    if (!account || account.status !== "active") return res.status(401).json({ error: "Tài khoản không hoạt động.", code: "ACCOUNT_INACTIVE" })
    req.user = { id: account.id, role: account.role, email: account.email }
    next()
  } catch {
    return res.status(503).json({ error: "Không thể kết nối PostgreSQL.", code: "DATABASE_UNAVAILABLE" })
  }
}

export function optionalAuth(req, res, next) {
  if (req.get("authorization")) return requireAuth(req, res, next)
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Vui lòng đăng nhập." })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này.", code: "FORBIDDEN" })
    next()
  }
}
