import { Router } from "express"
import bcrypt from "bcryptjs"
import { z } from "zod"
import XLSX from "xlsx"
import PDFDocument from "pdfkit"
import { pool } from "../config/db.js"
import ForumPost from "../models/ForumPost.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
router.use(requireAuth, requireRole("admin"))
const userView = (row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role, status: row.status, initials: row.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase(), createdAt: row.created_at })

router.get("/users", async (req, res) => {
  const q = z.string().max(200).optional().parse(req.query.q)
  const { rows } = await pool.query(`SELECT id,name,email,phone,role,status,created_at FROM users ${q ? "WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1" : ""} ORDER BY created_at DESC`, q ? [`%${q}%`] : [])
  res.json({ items: rows.map(userView) })
})

router.post("/users", async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(120), email: z.email().transform((value) => value.toLowerCase()), phone: z.string().trim().min(9).max(20), role: z.enum(["renter", "landlord", "admin"]), password: z.string().min(8).max(128) }).parse(req.body)
  const hash = await bcrypt.hash(input.password, 12)
  const { rows } = await pool.query("INSERT INTO users(name,email,phone,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,phone,role,status,created_at", [input.name, input.email, input.phone.replace(/\s/g, ""), hash, input.role])
  res.status(201).json({ item: userView(rows[0]) })
})

router.patch("/users/:id", async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(120).optional(), email: z.email().transform((value) => value.toLowerCase()).optional(), phone: z.string().trim().min(9).max(20).optional(), role: z.enum(["renter", "landlord", "admin"]).optional(), status: z.enum(["active", "locked"]).optional(), password: z.string().min(8).max(128).optional() }).parse(req.body)
  if (req.params.id === req.user.id && (input.role && input.role !== "admin" || input.status === "locked")) return res.status(400).json({ error: "Không thể tự gỡ quyền quản trị hoặc khóa tài khoản của chính mình." })
  if ((input.role && input.role !== "admin") || input.status === "locked") {
    const check = await pool.query("SELECT role,status FROM users WHERE id=$1", [req.params.id])
    if (check.rows[0]?.role === "admin" && check.rows[0].status === "active") {
      const count = await pool.query("SELECT count(*)::int AS count FROM users WHERE role='admin' AND status='active'")
      if (count.rows[0].count <= 1) return res.status(400).json({ error: "Cần giữ ít nhất một quản trị viên đang hoạt động." })
    }
  }
  const old = (await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id])).rows[0]
  if (!old) return res.status(404).json({ error: "Không tìm thấy tài khoản." })
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : old.password_hash
  const { rows } = await pool.query("UPDATE users SET name=$2,email=$3,phone=$4,role=$5,status=$6,password_hash=$7,updated_at=now() WHERE id=$1 RETURNING id,name,email,phone,role,status,created_at", [old.id, input.name ?? old.name, input.email ?? old.email, input.phone?.replace(/\s/g, "") ?? old.phone, input.role ?? old.role, input.status ?? old.status, passwordHash])
  res.json({ item: userView(rows[0]) })
})

router.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Không thể xóa tài khoản đang đăng nhập." })
  const existing = await pool.query("SELECT role,status FROM users WHERE id=$1", [req.params.id])
  if (!existing.rows[0]) return res.status(404).json({ error: "Không tìm thấy tài khoản." })
  if (existing.rows[0].role === "admin" && existing.rows[0].status === "active") {
    const count = await pool.query("SELECT count(*)::int AS count FROM users WHERE role='admin' AND status='active'")
    if (count.rows[0].count <= 1) return res.status(400).json({ error: "Cần giữ ít nhất một quản trị viên đang hoạt động." })
  }
  await pool.query("DELETE FROM users WHERE id=$1", [req.params.id])
  res.json({ message: "Đã xóa tài khoản." })
})

router.get("/listings", async (req, res) => {
  const input = z.object({ q: z.string().max(200).optional(), status: z.enum(["pending", "active", "hidden", "rented", "rejected"]).optional() }).parse(req.query)
  const filters = []
  const values = []
  if (input.q) { values.push(`%${input.q}%`); filters.push(`(l.title ILIKE $${values.length} OR l.location ILIKE $${values.length})`) }
  if (input.status) { values.push(input.status); filters.push(`l.status=$${values.length}`) }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
  const { rows } = await pool.query(`SELECT l.*,u.name AS owner_name,u.phone AS owner_phone,round(l.price_vnd::numeric/1000000,1)::float AS price_value,l.area_m2::float AS area_value,to_char(l.price_vnd,'FM999G999G999G990')||'đ' AS price_label FROM listings l JOIN users u ON u.id=l.owner_id ${where} ORDER BY l.created_at DESC`, values)
  res.json({ items: rows.map((row) => ({ id: row.id, title: row.title, price: row.price_label, priceValue: row.price_value, area: `${row.area_value} m²`, areaValue: row.area_value, location: row.location, type: row.room_type, amenities: row.amenities, image: row.image_url, gallery: row.gallery, ownerId: row.owner_id, ownerName: row.owner_name, phone: row.contact_phone ?? row.owner_phone, deposit: row.deposit_text, description: row.description, status: row.status, views: row.views, contacts: row.contacts, createdAt: row.created_at })) })
})

router.get("/forum", async (_req, res) => {
  const items = await ForumPost.find().sort({ createdAt: -1 }).limit(300)
  res.json({ items: items.map((item) => { const post = item.toObject({ virtuals: true }); return { ...post, id: String(item._id), comments: post.comments.map((c) => ({ ...c, id: String(c._id) })) } }) })
})

router.get("/categories", async (_req, res) => {
  const { rows } = await pool.query("SELECT id,type,name,status FROM categories ORDER BY type,name")
  res.json({ items: rows })
})

router.post("/categories", async (req, res) => {
  const input = z.object({ type: z.enum(["Khu vực", "Loại phòng", "Tiện ích"]), name: z.string().trim().min(2).max(100), status: z.enum(["active", "hidden"]).default("active") }).parse(req.body)
  const { rows } = await pool.query("INSERT INTO categories(type,name,status) VALUES($1,$2,$3) RETURNING id,type,name,status", [input.type, input.name, input.status])
  res.status(201).json({ item: rows[0] })
})

router.patch("/categories/:id", async (req, res) => {
  const input = z.object({ type: z.enum(["Khu vực", "Loại phòng", "Tiện ích"]).optional(), name: z.string().trim().min(2).max(100).optional(), status: z.enum(["active", "hidden"]).optional() }).parse(req.body)
  const old = (await pool.query("SELECT * FROM categories WHERE id=$1", [req.params.id])).rows[0]
  if (!old) return res.status(404).json({ error: "Không tìm thấy danh mục." })
  const { rows } = await pool.query("UPDATE categories SET type=$2,name=$3,status=$4 WHERE id=$1 RETURNING id,type,name,status", [old.id, input.type ?? old.type, input.name ?? old.name, input.status ?? old.status])
  res.json({ item: rows[0] })
})

router.delete("/categories/:id", async (req, res) => {
  const result = await pool.query("DELETE FROM categories WHERE id=$1", [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: "Không tìm thấy danh mục." })
  res.json({ message: "Đã xóa danh mục." })
})

async function getStats(days = 30) {
  const interval = z.number().int().min(1).max(3650).parse(Number(days))
  const [users, listings, statuses, forum, reports, favorites, reviews] = await Promise.all([
    pool.query("SELECT role,count(*)::int AS count FROM users WHERE created_at>=now()-($1*interval '1 day') GROUP BY role", [interval]),
    pool.query("SELECT count(*)::int AS count,coalesce(sum(views),0)::int AS views,coalesce(sum(contacts),0)::int AS contacts FROM listings WHERE created_at>=now()-($1*interval '1 day')", [interval]),
    pool.query("SELECT status,count(*)::int AS count FROM listings WHERE created_at>=now()-($1*interval '1 day') GROUP BY status", [interval]),
    ForumPost.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - interval * 86400000) } } }, { $group: { _id: null, posts: { $sum: 1 }, comments: { $sum: { $size: "$comments" } }, likes: { $sum: { $size: "$likedBy" } } } }]),
    pool.query("SELECT count(*)::int AS count FROM reports WHERE status='pending' AND created_at>=now()-($1*interval '1 day')", [interval]),
    pool.query("SELECT (SELECT count(*)::int FROM favorites WHERE created_at>=now()-($1*interval '1 day')) AS favorites,(SELECT count(*)::int FROM reviews WHERE created_at>=now()-($1*interval '1 day')) AS reviews", [interval]),
  ])
  return { days: interval, users: users.rows, listings: listings.rows[0], listingStatuses: statuses.rows, community: forum[0] ?? { posts: 0, comments: 0, likes: 0 }, pendingReports: reports.rows[0].count, interactions: { favorites: reviews.rows[0].favorites, reviews: reviews.rows[0].reviews } }
}
router.get("/stats", async (req, res) => {
  const days = z.coerce.number().int().min(1).max(3650).default(30).parse(req.query.days)
  res.json({ stats: await getStats(days) })
})
router.get("/stats/export", async (req, res) => {
  const { format, days } = z.object({ format: z.enum(["xlsx", "pdf"]), days: z.coerce.number().int().min(1).max(3650).default(30) }).parse(req.query)
  const stats = await getStats(days)
  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new()
    const rows = [
      ["Hạng mục", "Giá trị"],
      ["Tổng tin cho thuê", stats.listings.count], ["Lượt xem tin", stats.listings.views], ["Lượt liên hệ", stats.listings.contacts],
      ["Báo cáo chờ xử lý", stats.pendingReports], ["Bài viết diễn đàn", stats.community.posts], ["Bình luận", stats.community.comments], ["Lượt thích", stats.community.likes],
      ["Lượt lưu tin", stats.interactions.favorites], ["Đánh giá phòng", stats.interactions.reviews],
      ...stats.users.map((item) => [`Tài khoản: ${item.role}`, item.count]), ...stats.listingStatuses.map((item) => [`Tin: ${item.status}`, item.count]),
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Thong ke")
    const data = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", "attachment; filename=tro-oi-thong-ke.xlsx")
    return res.send(data)
  }
  const doc = new PDFDocument({ size: "A4", margin: 48 })
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", "attachment; filename=tro-oi-thong-ke.pdf")
  doc.pipe(res)
  doc.fontSize(18).text("Tro Oi - Platform report")
  doc.moveDown().fontSize(11).text(`Rental listings: ${stats.listings.count}`)
  doc.text(`Listing views: ${stats.listings.views}`)
  doc.text(`Contact events: ${stats.listings.contacts}`)
  doc.text(`Pending reports: ${stats.pendingReports}`)
  doc.text(`Forum posts: ${stats.community.posts}`)
  doc.text(`Comments: ${stats.community.comments}`)
  doc.text(`Post likes: ${stats.community.likes}`)
  doc.text(`Saved listings: ${stats.interactions.favorites}`)
  doc.text(`Room reviews: ${stats.interactions.reviews}`)
  for (const item of stats.users) doc.text(`Users (${item.role}): ${item.count}`)
  doc.end()
})

export default router
