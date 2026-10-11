import { Router } from "express"
import { pool } from "../config/db.js"

const router = Router()
router.get("/", async (_req, res) => {
  const { rows } = await pool.query("SELECT id,name,role,status,created_at FROM users WHERE status='active' AND role IN ('renter','landlord') ORDER BY created_at DESC LIMIT 100")
  res.json({ items: rows.map((row) => ({ id: row.id, name: row.name, role: row.role, status: row.status, email: "", phone: "", initials: row.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase(), createdAt: row.created_at })) })
})
export default router
