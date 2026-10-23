import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import { requireAuth } from "../middleware/auth.js"
import { requireRole } from "../middleware/auth.js"
import Notification from "../models/Notification.js"

const router = Router()
router.use(requireAuth)
router.get("/", async (req, res) => {
  const rows = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100).lean()
  res.json({ items: rows.map((row) => ({ id: String(row._id), userId: row.userId, title: row.title, detail: row.detail, read: row.read, createdAt: row.createdAt })) })
})
router.patch("/read", async (req, res) => {
  const input = z.object({ ids: z.array(z.string()).max(100).optional() }).parse(req.body)
  const filter = input.ids?.length ? { userId: req.user.id, _id: { $in: input.ids } } : { userId: req.user.id }
  await Notification.updateMany(filter, { $set: { read: true } })
  res.json({ message: "Đã đánh dấu thông báo đã đọc." })
})
router.post("/", requireRole("admin"), async (req, res) => {
  const input = z.object({ userId: z.string().min(1), title: z.string().trim().min(1).max(300), detail: z.string().trim().min(1).max(3000) }).parse(req.body)
  const user = await pool.query("SELECT id FROM users WHERE id=$1", [input.userId])
  if (!user.rows[0]) return res.status(404).json({ error: "Không tìm thấy tài khoản." })
  const row = await Notification.create({ userId: input.userId, title: input.title, detail: input.detail })
  res.status(201).json({ item: { id: String(row._id), userId: row.userId, title: row.title, detail: row.detail, read: row.read, createdAt: row.createdAt } })
})
export default router
