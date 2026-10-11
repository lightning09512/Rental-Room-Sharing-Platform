import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import ForumPost from "../models/ForumPost.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()

router.get("/mine", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM reports WHERE reporter_id=$1 ORDER BY created_at DESC", [req.user.id])
  res.json({ items: rows.map((item) => ({ id: item.id, reporterId: item.reporter_id, targetType: item.target_type, targetId: item.target_id, targetTitle: item.target_title, reason: item.reason, description: item.description, status: item.status, adminNote: item.admin_note, createdAt: item.created_at })) })
})

router.post("/", requireAuth, async (req, res) => {
  const input = z.object({ targetType: z.enum(["Tin phòng", "Bài viết", "Bình luận"]), targetId: z.string().min(1), targetTitle: z.string().trim().min(1).max(240), reason: z.string().trim().min(2).max(200), description: z.string().trim().max(2000).default("") }).parse(req.body)
  let exists = false
  if (input.targetType === "Tin phòng") exists = Boolean((await pool.query("SELECT id FROM listings WHERE id=$1", [input.targetId])).rows[0])
  else {
    const post = input.targetType === "Bài viết"
      ? await ForumPost.findById(input.targetId)
      : await ForumPost.findOne({ "comments._id": input.targetId })
    exists = Boolean(post)
  }
  if (!exists) return res.status(404).json({ error: "Nội dung cần báo cáo không còn tồn tại." })
  const reporter = await pool.query("SELECT name FROM users WHERE id=$1", [req.user.id])
  const { rows } = await pool.query("INSERT INTO reports(reporter_id,target_type,target_id,target_title,reason,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [req.user.id, input.targetType, input.targetId, input.targetTitle, input.reason, input.description])
  const admins = await pool.query("SELECT id FROM users WHERE role='admin' AND status='active'")
  for (const admin of admins.rows) await pool.query("INSERT INTO notifications(user_id,title,detail) VALUES($1,$2,$3)", [admin.id, "Có báo cáo mới", `${reporter.rows[0]?.name ?? "Thành viên"} đã báo cáo: ${input.targetTitle}`])
  res.status(201).json({ item: { id: rows[0].id, reporterId: rows[0].reporter_id, reporter: reporter.rows[0]?.name ?? "Thành viên", ...input, status: rows[0].status, adminNote: rows[0].admin_note, createdAt: rows[0].created_at } })
})

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const status = z.enum(["pending", "accepted", "rejected"]).optional().parse(req.query.status)
  const { rows } = await pool.query(`SELECT r.*,u.name AS reporter FROM reports r JOIN users u ON u.id=r.reporter_id ${status ? "WHERE r.status=$1" : ""} ORDER BY r.created_at DESC`, status ? [status] : [])
  res.json({ items: rows.map((item) => ({ id: item.id, reporterId: item.reporter_id, reporter: item.reporter, targetType: item.target_type, targetId: item.target_id, targetTitle: item.target_title, reason: item.reason, description: item.description, status: item.status, adminNote: item.admin_note, createdAt: item.created_at })) })
})

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const input = z.object({ status: z.enum(["accepted", "rejected"]), note: z.string().trim().max(2000).default("") }).parse(req.body)
  const { rows } = await pool.query("UPDATE reports SET status=$2,admin_note=$3,resolved_by=$4,updated_at=now() WHERE id=$1 RETURNING *", [req.params.id, input.status, input.note, req.user.id])
  if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy báo cáo." })
  await pool.query("INSERT INTO notifications(user_id,title,detail) VALUES($1,$2,$3)", [rows[0].reporter_id, "Báo cáo đã được xử lý", input.note || (input.status === "accepted" ? "Quản trị viên đã tiếp nhận báo cáo của bạn." : "Quản trị viên đã xem xét và từ chối báo cáo của bạn.")])
  res.json({ item: { id: rows[0].id, status: rows[0].status, adminNote: rows[0].admin_note } })
})

router.post("/:id/warning", requireAuth, requireRole("admin"), async (req, res) => {
  const input = z.object({ userId: z.string().min(1), note: z.string().trim().min(3).max(2000) }).parse(req.body)
  const user = await pool.query("SELECT id FROM users WHERE id=$1 AND status='active'", [input.userId])
  if (!user.rows[0]) return res.status(404).json({ error: "Không tìm thấy tài khoản đang hoạt động." })
  await pool.query("INSERT INTO notifications(user_id,title,detail) VALUES($1,$2,$3)", [input.userId, "Cảnh báo từ quản trị viên", input.note])
  res.status(201).json({ message: "Đã gửi cảnh báo." })
})

export default router
