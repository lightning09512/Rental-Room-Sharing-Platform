import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
const listingSelect = `SELECT l.*, u.name AS owner_name, u.phone AS owner_phone,
  CASE WHEN l.price_vnd >= 1000000 THEN round((l.price_vnd::numeric/1000000),1)::float ELSE (l.price_vnd::float/1000000) END AS price_value,
  to_char(l.price_vnd, 'FM999G999G999G990') || 'đ' AS price_label,
  l.area_m2::float AS area_value,
  COALESCE((SELECT json_agg(r) FROM (SELECT id, author_id, stars, text, created_at FROM reviews WHERE listing_id=l.id ORDER BY created_at DESC) r), '[]'::json) AS reviews
  FROM listings l JOIN users u ON u.id=l.owner_id`
const asListing = (row, includePhone = false) => ({
  id: row.id, title: row.title, price: row.price_label, priceValue: row.price_value, area: `${row.area_value} m²`, areaValue: row.area_value,
  location: row.location, type: row.room_type, amenities: row.amenities, image: row.image_url, gallery: row.gallery,
  badge: row.status === "active" ? "Đang hiển thị" : row.status, mapX: 50, mapY: 50, latitude: row.latitude, longitude: row.longitude,
  ownerId: row.owner_id, ownerName: row.owner_name, ...(includePhone ? { phone: row.owner_phone } : {}), deposit: row.deposit_text, description: row.description,
  status: row.status, currentTenantId: row.current_tenant_id ?? null, views: row.views, contacts: row.contacts, createdAt: row.created_at,
})
const listingInput = z.object({
  title: z.string().trim().min(8).max(180), location: z.string().trim().min(2).max(300),
  priceValue: z.coerce.number().positive().max(500), areaValue: z.coerce.number().positive().max(10000),
  type: z.string().trim().min(2).max(100), description: z.string().trim().min(10).max(5000),
  amenities: z.array(z.string().max(100)).max(40).default([]), image: z.string().min(1).max(2048), gallery: z.array(z.string().max(2048)).max(20).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(), longitude: z.coerce.number().min(-180).max(180).optional(),
  deposit: z.string().max(100).default("Thỏa thuận"), phone: z.string().trim().min(9).max(20).optional(), currentTenantId: z.string().nullable().optional(),
})
const lookup = async (id) => pool.query(`${listingSelect} WHERE l.id=$1 LIMIT 1`, [id])
const canManage = (req, row) => req.user.role === "admin" || row.owner_id === req.user.id

router.get("/", async (req, res) => {
  const query = z.object({ q: z.string().optional(), location: z.string().optional(), type: z.string().optional(), amenities: z.string().optional(), minPrice: z.coerce.number().optional(), maxPrice: z.coerce.number().optional(), minArea: z.coerce.number().optional(), maxArea: z.coerce.number().optional(), lat: z.coerce.number().optional(), lng: z.coerce.number().optional(), radiusKm: z.coerce.number().min(1).max(100).optional(), sort: z.enum(["newest", "price_asc", "price_desc", "area_desc", "nearby"]).default("newest"), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(60).default(24) }).parse(req.query)
  const filters = ["l.status='active'"]
  const values = []
  let nearbyLngIndex
  let nearbyLatIndex
  const add = (sql, value) => { values.push(value); filters.push(sql.replace("?", `$${values.length}`)) }
  if (query.q) { values.push(`%${query.q}%`, `%${query.q}%`); filters.push(`(unaccent(l.title) ILIKE unaccent($${values.length - 1}) OR unaccent(l.location) ILIKE unaccent($${values.length}))`) }
  if (query.location) { values.push(`%${query.location}%`); filters.push(`unaccent(l.location) ILIKE unaccent($${values.length})`) }
  if (query.type) add("l.room_type = ?", query.type)
  if (query.amenities) {
    const amenities = query.amenities.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 40)
    if (amenities.length) add("l.amenities @> ?::jsonb", JSON.stringify(amenities))
  }
  if (query.minPrice !== undefined) add("l.price_vnd >= ?", Math.round(query.minPrice * 1_000_000))
  if (query.maxPrice !== undefined) add("l.price_vnd <= ?", Math.round(query.maxPrice * 1_000_000))
  if (query.minArea !== undefined) add("l.area_m2 >= ?", query.minArea)
  if (query.maxArea !== undefined) add("l.area_m2 <= ?", query.maxArea)
  if (query.lat !== undefined && query.lng !== undefined && query.radiusKm) {
    values.push(query.lng, query.lat, query.radiusKm * 1000)
    const n = values.length
    nearbyLngIndex = n - 2
    nearbyLatIndex = n - 1
    filters.push(`l.geom IS NOT NULL AND ST_DWithin(l.geom, ST_SetSRID(ST_MakePoint($${n - 2},$${n - 1}),4326)::geography,$${n})`)
  }
  const countValues = [...values]
  const countResult = await pool.query(`SELECT count(*)::int AS total FROM listings l WHERE ${filters.join(" AND ")}`, countValues)
  if (query.sort === "nearby" && query.lat !== undefined && query.lng !== undefined && !nearbyLngIndex) {
    values.push(query.lng, query.lat)
    nearbyLngIndex = values.length - 1
    nearbyLatIndex = values.length
  }
  const order = query.sort === "price_asc" ? "l.price_vnd ASC" : query.sort === "price_desc" ? "l.price_vnd DESC" : query.sort === "area_desc" ? "l.area_m2 DESC" : query.sort === "nearby" && nearbyLngIndex ? `ST_Distance(l.geom,ST_SetSRID(ST_MakePoint($${nearbyLngIndex},$${nearbyLatIndex}),4326)::geography) ASC NULLS LAST` : "l.created_at DESC"
  const offset = (query.page - 1) * query.limit
  values.push(query.limit, offset)
  const result = await pool.query(`${listingSelect} WHERE ${filters.join(" AND ")} ORDER BY ${order}, l.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values)
  res.json({ items: result.rows.map(asListing), page: query.page, limit: query.limit, total: countResult.rows[0].total })
})

router.get("/mine", requireAuth, requireRole("landlord", "admin"), async (req, res) => {
  const { rows } = await pool.query(`${listingSelect} WHERE ($1='admin' OR l.owner_id=$2) ORDER BY l.created_at DESC`, [req.user.role, req.user.id])
  res.json({ items: rows.map((row) => asListing(row, true)) })
})

router.get("/rentals", requireAuth, requireRole("renter"), async (req, res) => {
  const { rows } = await pool.query(`${listingSelect} WHERE l.current_tenant_id=$1 AND l.status='rented' ORDER BY l.updated_at DESC`, [req.user.id])
  res.json({ items: rows.map(asListing) })
})

router.get("/:id", async (req, res) => {
  const { rows } = await lookup(req.params.id)
  const row = rows[0]
  if (!row || !(row.status === "active" || (req.user && (req.user.id === row.owner_id || req.user.role === "admin")))) return res.status(404).json({ error: "Tin phòng không còn hiển thị." })
  res.json({ item: asListing(row) })
})

router.post("/", requireAuth, requireRole("landlord"), async (req, res) => {
  const input = listingInput.parse(req.body)
  if (input.image.startsWith("data:")) return res.status(400).json({ error: "Ảnh cần được tải lên dịch vụ lưu trữ trước khi đăng tin." })
  const { rows } = await pool.query(`INSERT INTO listings(owner_id,title,description,price_vnd,deposit_text,area_m2,location,room_type,amenities,image_url,gallery,latitude,longitude,contact_phone,status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending') RETURNING id`, [req.user.id, input.title, input.description, Math.round(input.priceValue * 1_000_000), input.deposit, input.areaValue, input.location, input.type, JSON.stringify(input.amenities), input.image, JSON.stringify(input.gallery || [input.image]), input.latitude ?? null, input.longitude ?? null, input.phone?.replace(/\s/g, "") || null])
  const created = await lookup(rows[0].id)
  res.status(201).json({ item: asListing(created.rows[0], true) })
})

router.patch("/:id", requireAuth, async (req, res) => {
  const found = await pool.query("SELECT * FROM listings WHERE id=$1", [req.params.id])
  if (!found.rows[0] || !canManage(req, found.rows[0])) return res.status(found.rows[0] ? 403 : 404).json({ error: found.rows[0] ? "Bạn không sở hữu tin này." : "Không tìm thấy tin phòng." })
  const input = listingInput.partial().parse(req.body)
  if (input.image?.startsWith("data:")) return res.status(400).json({ error: "Ảnh cần được tải lên dịch vụ lưu trữ trước khi lưu." })
  const old = found.rows[0]
  const { rows } = await pool.query(`UPDATE listings SET title=$2,location=$3,price_vnd=$4,area_m2=$5,room_type=$6,description=$7,amenities=$8,image_url=$9,gallery=$10,latitude=$11,longitude=$12,deposit_text=$13,contact_phone=$14,status=$15,updated_at=now()
    WHERE id=$1 RETURNING id`, [old.id, input.title ?? old.title, input.location ?? old.location, input.priceValue === undefined ? old.price_vnd : Math.round(input.priceValue * 1_000_000), input.areaValue ?? old.area_m2, input.type ?? old.room_type, input.description ?? old.description, JSON.stringify(input.amenities ?? old.amenities), input.image ?? old.image_url, JSON.stringify(input.gallery ?? old.gallery), input.latitude ?? old.latitude, input.longitude ?? old.longitude, input.deposit ?? old.deposit_text, input.phone === undefined ? old.contact_phone : input.phone.replace(/\s/g, "") || null, req.user.role === "admin" ? (req.body.status ?? old.status) : (old.status === "rejected" ? "pending" : old.status)])
  const updated = await lookup(rows[0].id)
  res.json({ item: asListing(updated.rows[0], true) })
})

router.patch("/:id/status", requireAuth, async (req, res) => {
  const input = z.object({ status: z.enum(["pending", "active", "hidden", "rented", "rejected"]), currentTenantId: z.string().nullable().optional(), note: z.string().max(1000).optional() }).parse(req.body)
  const found = await pool.query("SELECT * FROM listings WHERE id=$1", [req.params.id])
  if (!found.rows[0] || !canManage(req, found.rows[0])) return res.status(found.rows[0] ? 403 : 404).json({ error: found.rows[0] ? "Bạn không sở hữu tin này." : "Không tìm thấy tin phòng." })
  if (req.user.role !== "admin" && ["pending", "rejected"].includes(input.status)) return res.status(403).json({ error: "Chủ trọ không thể tự duyệt hoặc từ chối tin." })
  if (req.user.role !== "admin" && input.status === "active" && !["active", "hidden"].includes(found.rows[0].status)) return res.status(403).json({ error: "Tin cần được quản trị viên duyệt trước khi hiển thị." })
  if (input.status === "rented" && input.currentTenantId) {
    const tenant = await pool.query("SELECT id FROM users WHERE id=$1 AND role='renter' AND status='active'", [input.currentTenantId])
    if (!tenant.rows[0]) return res.status(400).json({ error: "Người thuê hiện tại không hợp lệ." })
  }
  await pool.query("UPDATE listings SET status=$2, current_tenant_id=$3, moderation_note=$4, updated_at=now() WHERE id=$1", [req.params.id, input.status, input.status === "rented" ? (input.currentTenantId ?? found.rows[0].current_tenant_id) : null, req.user.role === "admin" ? input.note ?? "" : found.rows[0].moderation_note])
  const { rows } = await lookup(req.params.id)
  res.json({ item: asListing(rows[0], true) })
})

router.delete("/:id", requireAuth, async (req, res) => {
  const found = await pool.query("SELECT owner_id FROM listings WHERE id=$1", [req.params.id])
  if (!found.rows[0]) return res.status(404).json({ error: "Không tìm thấy tin phòng." })
  if (req.user.role !== "admin" && found.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: "Bạn không sở hữu tin này." })
  await pool.query("DELETE FROM listings WHERE id=$1", [req.params.id])
  res.json({ message: "Đã xóa tin phòng." })
})

router.post("/:id/contact", async (req, res) => {
  const updated = await pool.query("UPDATE listings SET contacts=contacts+1 WHERE id=$1 AND status='active' RETURNING owner_id,contact_phone", [req.params.id])
  if (!updated.rows[0]) return res.status(404).json({ error: "Tin phòng không còn hiển thị." })
  const owner = await pool.query("SELECT phone FROM users WHERE id=$1 AND status='active'", [updated.rows[0].owner_id])
  res.json({ phone: updated.rows[0].contact_phone ?? owner.rows[0]?.phone ?? "" })
})

router.post("/:id/view", async (req, res) => {
  const { rows } = await pool.query("UPDATE listings SET views=views+1 WHERE id=$1 AND status='active' RETURNING views", [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: "Tin phòng không còn hiển thị." })
  res.json({ views: rows[0].views })
})

router.get("/:id/reviews", async (req, res) => {
  const { rows } = await pool.query("SELECT r.id,r.listing_id,r.author_id,u.name AS author,left(u.name,2) AS initials,r.stars,r.text,r.created_at FROM reviews r JOIN users u ON u.id=r.author_id WHERE r.listing_id=$1 ORDER BY r.created_at DESC", [req.params.id])
  res.json({ items: rows.map((r) => ({ id: r.id, listingId: r.listing_id, authorId: r.author_id, author: r.author, initials: r.initials, stars: r.stars, text: r.text, createdAt: r.created_at })) })
})

router.post("/:id/reviews", requireAuth, requireRole("renter"), async (req, res) => {
  const input = z.object({ stars: z.number().int().min(1).max(5), text: z.string().trim().min(2).max(3000) }).parse(req.body)
  const rental = await pool.query("SELECT current_tenant_id FROM listings WHERE id=$1 AND status='rented'", [req.params.id])
  if (rental.rows[0]?.current_tenant_id !== req.user.id) return res.status(403).json({ error: "Chỉ người thuê đã được ghi nhận cho phòng mới có thể đánh giá." })
  const { rows } = await pool.query("INSERT INTO reviews(listing_id,author_id,stars,text) VALUES($1,$2,$3,$4) ON CONFLICT(listing_id,author_id) DO UPDATE SET stars=excluded.stars,text=excluded.text,updated_at=now() RETURNING *", [req.params.id, req.user.id, input.stars, input.text])
  res.status(201).json({ item: { id: rows[0].id, listingId: rows[0].listing_id, authorId: rows[0].author_id, stars: rows[0].stars, text: rows[0].text, createdAt: rows[0].created_at } })
})

router.delete("/:id/reviews/:reviewId", requireAuth, async (req, res) => {
  const result = await pool.query("DELETE FROM reviews WHERE id=$1 AND listing_id=$2 AND author_id=$3", [req.params.reviewId, req.params.id, req.user.id])
  if (!result.rowCount && req.user.role !== "admin") return res.status(404).json({ error: "Không tìm thấy đánh giá của bạn." })
  if (req.user.role === "admin") await pool.query("DELETE FROM reviews WHERE id=$1 AND listing_id=$2", [req.params.reviewId, req.params.id])
  res.json({ message: "Đã xóa đánh giá." })
})

export default router
