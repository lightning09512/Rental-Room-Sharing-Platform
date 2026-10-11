import { Router } from "express"
import { pool } from "../config/db.js"

const router = Router()
router.get("/", async (_req, res) => {
  const { rows } = await pool.query("SELECT id,type,name,status FROM categories WHERE status='active' ORDER BY type,name")
  res.json({ items: rows })
})
export default router
