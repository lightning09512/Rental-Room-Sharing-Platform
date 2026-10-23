import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
const million = 1_000_000
const vietnamDate = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
const futureDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= vietnamDate()
}, "Ngày cần hợp lệ và là hôm nay hoặc trong tương lai.")

const transferFields = {
  title: z.string().trim().min(8).max(180),
  description: z.string().trim().min(20).max(4000),
  location: z.string().trim().min(2).max(300),
  priceValue: z.number().positive().max(1000),
  transferFeeValue: z.number().min(0).max(10000).nullable(),
  deposit: z.string().trim().max(200),
  areaValue: z.number().positive().max(10000),
  type: z.string().trim().min(2).max(80),
  contractEndDate: futureDate,
  availableFrom: futureDate.nullable(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30),
  image: z.string().trim().max(2048),
  gallery: z.array(z.string().trim().max(2048)).max(12),
}
const transferInput = z.object({
  ...transferFields,
  deposit: transferFields.deposit.default("Thỏa thuận"),
  amenities: transferFields.amenities.default([]),
  image: transferFields.image.default(""),
  gallery: transferFields.gallery.default([]),
})
const transferUpdate = z.object(transferFields).partial().refine((value) => Object.keys(value).length > 0, "Cần có ít nhất một thông tin để cập nhật.")
const hasInlineImage = (value) => [value.image, ...(value.gallery ?? [])].some((image) => image?.startsWith("data:") || image?.startsWith("blob:"))

const formatPrice = (amount) => `${(Number(amount) / million).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`

export function asTransfer(row) {
  const priceValue = Number(row.monthly_rent_vnd) / million
  const transferFeeValue = row.transfer_fee_vnd === null ? null : Number(row.transfer_fee_vnd) / million
  const areaValue = Number(row.area_m2)
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    description: row.description,
    location: row.location,
    priceValue,
    price: formatPrice(row.monthly_rent_vnd),
    transferFeeValue,
    transferFee: transferFeeValue === null ? "Thỏa thuận" : formatPrice(row.transfer_fee_vnd),
    deposit: row.deposit_text,
    areaValue,
    area: `${areaValue} m²`,
    type: row.room_type,
    contractEndDate: String(row.contract_end_date).slice(0, 10),
    availableFrom: row.available_from ? String(row.available_from).slice(0, 10) : "",
    amenities: row.amenities ?? [],
    image: row.image_url ?? "",
    gallery: row.gallery ?? [],
    status: row.status,
    moderationNote: row.moderation_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findTransfer(id, db = pool) {
  const { rows } = await db.query(
    "SELECT t.*,u.name AS owner_name FROM transfers t JOIN users u ON u.id=t.owner_id WHERE t.id=$1",
    [id],
  )
  return rows[0] ?? null
}

function toDbValues(input) {
  return [
    input.title,
    input.description,
    input.location,
    Math.round(input.priceValue * million),
    input.transferFeeValue === null ? null : Math.round(input.transferFeeValue * million),
    input.deposit || "Thỏa thuận",
    input.areaValue,
    input.type,
    input.contractEndDate,
    input.availableFrom || null,
    JSON.stringify(input.amenities),
    input.image,
    JSON.stringify(input.gallery.length ? input.gallery : input.image ? [input.image] : []),
  ]
}

router.get("/", requireAuth, requireRole("renter"), async (req, res) => {
  const filters = z.object({
    q: z.string().trim().max(200).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    maxFee: z.coerce.number().min(0).optional(),
    minArea: z.coerce.number().min(0).optional(),
    maxArea: z.coerce.number().min(0).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(200),
  }).parse(req.query)
  const clauses = ["t.status='active'"]
  const values = []
  if (filters.q) {
    values.push(`%${filters.q}%`)
    clauses.push(`(unaccent(lower(t.title)) LIKE unaccent(lower($${values.length})) OR unaccent(lower(t.location)) LIKE unaccent(lower($${values.length})))`)
  }
  if (filters.minPrice !== undefined) { values.push(Math.round(filters.minPrice * million)); clauses.push(`t.monthly_rent_vnd >= $${values.length}`) }
  if (filters.maxPrice !== undefined) { values.push(Math.round(filters.maxPrice * million)); clauses.push(`t.monthly_rent_vnd <= $${values.length}`) }
  if (filters.maxFee !== undefined) { values.push(Math.round(filters.maxFee * million)); clauses.push(`(t.transfer_fee_vnd IS NULL OR t.transfer_fee_vnd <= $${values.length})`) }
  if (filters.minArea !== undefined) { values.push(filters.minArea); clauses.push(`t.area_m2 >= $${values.length}`) }
  if (filters.maxArea !== undefined) { values.push(filters.maxArea); clauses.push(`t.area_m2 <= $${values.length}`) }
  const where = clauses.join(" AND ")
  const [result, count] = await Promise.all([
    pool.query(
      `SELECT t.*,u.name AS owner_name FROM transfers t JOIN users u ON u.id=t.owner_id WHERE ${where} ORDER BY t.created_at DESC,t.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filters.limit, (filters.page - 1) * filters.limit],
    ),
    pool.query(`SELECT count(*)::int AS total FROM transfers t WHERE ${where}`, values),
  ])
  res.json({ items: result.rows.map(asTransfer), page: filters.page, limit: filters.limit, total: count.rows[0].total })
})

router.get("/mine", requireAuth, requireRole("renter"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT t.*,u.name AS owner_name FROM transfers t JOIN users u ON u.id=t.owner_id WHERE t.owner_id=$1 AND t.status<>'removed' ORDER BY t.created_at DESC",
    [req.user.id],
  )
  res.json({ items: rows.map(asTransfer) })
})

router.get("/:id", requireAuth, requireRole("renter"), async (req, res) => {
  const row = await findTransfer(req.params.id)
  if (!row || row.status === "removed" || (row.status !== "active" && row.owner_id !== req.user.id)) {
    return res.status(404).json({ error: "Không tìm thấy tin chuyển nhượng." })
  }
  res.json({ item: asTransfer(row) })
})

router.post("/", requireAuth, requireRole("renter"), async (req, res) => {
  const input = transferInput.parse(req.body)
  if (hasInlineImage(input)) return res.status(400).json({ error: "Ảnh cần được tải lên dịch vụ lưu trữ trước khi lưu." })
  const values = toDbValues(input)
  const { rows } = await pool.query(
    `INSERT INTO transfers(owner_id,title,description,location,monthly_rent_vnd,transfer_fee_vnd,deposit_text,area_m2,room_type,contract_end_date,available_from,amenities,image_url,gallery)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [req.user.id, ...values],
  )
  const saved = await findTransfer(rows[0].id)
  res.status(201).json({ item: asTransfer(saved) })
})

router.patch("/:id", requireAuth, requireRole("renter"), async (req, res) => {
  const input = transferUpdate.parse(req.body)
  if (hasInlineImage(input)) return res.status(400).json({ error: "Ảnh cần được tải lên dịch vụ lưu trữ trước khi lưu." })
  const old = await findTransfer(req.params.id)
  if (!old || old.owner_id !== req.user.id) return res.status(old ? 403 : 404).json({ error: old ? "Bạn không sở hữu tin này." : "Không tìm thấy tin chuyển nhượng." })
  if (["closed", "removed"].includes(old.status)) return res.status(409).json({ error: "Tin đã đóng hoặc gỡ nên không thể chỉnh sửa." })
  const current = {
    title: old.title,
    description: old.description,
    location: old.location,
    priceValue: Number(old.monthly_rent_vnd) / million,
    transferFeeValue: old.transfer_fee_vnd === null ? null : Number(old.transfer_fee_vnd) / million,
    deposit: old.deposit_text,
    areaValue: Number(old.area_m2),
    type: old.room_type,
    contractEndDate: String(old.contract_end_date).slice(0, 10),
    availableFrom: old.available_from ? String(old.available_from).slice(0, 10) : null,
    amenities: old.amenities ?? [],
    image: old.image_url ?? "",
    gallery: old.gallery ?? [],
  }
  const next = transferInput.parse({ ...current, ...input })
  const values = toDbValues(next)
  const changed = await pool.query(
    `UPDATE transfers SET title=$2,description=$3,location=$4,monthly_rent_vnd=$5,transfer_fee_vnd=$6,deposit_text=$7,area_m2=$8,room_type=$9,contract_end_date=$10,available_from=$11,amenities=$12,image_url=$13,gallery=$14,status='pending',moderation_note='',updated_at=now() WHERE id=$1 AND owner_id=$15 AND status IN ('pending','active','rejected') RETURNING id`,
    [req.params.id, ...values, req.user.id],
  )
  if (!changed.rowCount) return res.status(409).json({ error: "Tin đã thay đổi trạng thái. Vui lòng tải lại trang." })
  const saved = await findTransfer(req.params.id)
  res.json({ item: asTransfer(saved) })
})

router.delete("/:id", requireAuth, requireRole("renter"), async (req, res) => {
  const changed = await pool.query("UPDATE transfers SET status='closed',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status IN ('pending','active','rejected') RETURNING id", [req.params.id, req.user.id])
  if (!changed.rowCount) {
    const found = await pool.query("SELECT owner_id,status FROM transfers WHERE id=$1", [req.params.id])
    if (!found.rows[0] || found.rows[0].status === "removed") return res.status(404).json({ error: "Không tìm thấy tin chuyển nhượng." })
    if (found.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: "Bạn không sở hữu tin này." })
    return res.status(409).json({ error: "Tin đã đóng hoặc thay đổi trạng thái. Vui lòng tải lại trang." })
  }
  res.json({ message: "Đã đóng tin chuyển nhượng." })
})

export default router
