import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import { requireAuth } from "../middleware/auth.js"
import { requireRole } from "../middleware/auth.js"

const router = Router()
router.use(requireAuth)
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT id,user_id,title,detail,read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [req.user.id])
  res.json({ items: rows.map((row) => ({ id: row.id, userId: row.user_id, title: row.title, detail: row.detail, read: row.read, createdAt: row.created_at })) })
})
router.patch("/read", async (req, res) => {
  const input = z.object({ ids: z.array(z.string()).optional() }).parse(req.body)
  if (input.ids?.length) await pool.query("UPDATE notifications SET read=true WHERE user_id=$1 AND id=ANY($2::text[])", [req.user.id, input.ids])
  else await pool.query("UPDATE notifications SET read=true WHERE user_id=$1", [req.user.id])
  res.json({ message: "Đã đánh dấu thông báo đã đọc." })
})
router.post("/", requireRole("admin"), async (req, res) => {
  const input = z.object({ userId: z.string().min(1), title: z.string().trim().min(1).max(200), detail: z.string().trim().min(1).max(2000) }).parse(req.body)
  const { rows } = await pool.query("INSERT INTO notifications(user_id,title,detail) SELECT id,$2,$3 FROM users WHERE id=$1 RETURNING id,user_id,title,detail,read,created_at", [input.userId, input.title, input.detail])
  if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy tài khoản." })
  res.status(201).json({ item: { id: rows[0].id, userId: rows[0].user_id, title: rows[0].title, detail: rows[0].detail, read: rows[0].read, createdAt: rows[0].created_at } })
})
export default router
