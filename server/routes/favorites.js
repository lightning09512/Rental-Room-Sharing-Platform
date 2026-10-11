import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
router.use(requireAuth, requireRole("renter", "landlord"))

router.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT l.*,u.name AS owner_name,
    round(l.price_vnd::numeric/1000000,1)::float AS price_value,
    to_char(l.price_vnd,'FM999G999G999G990')||'đ' AS price_label,l.area_m2::float AS area_value
    FROM favorites f JOIN listings l ON l.id=f.listing_id JOIN users u ON u.id=l.owner_id
    WHERE f.user_id=$1 ORDER BY f.created_at DESC`, [req.user.id])
  res.json({ items: rows.map((row) => ({ id: row.id, title: row.title, price: row.price_label, priceValue: row.price_value, area: `${row.area_value} m²`, areaValue: row.area_value, location: row.location, type: row.room_type, amenities: row.amenities, image: row.image_url, gallery: row.gallery, latitude: row.latitude ?? undefined, longitude: row.longitude ?? undefined, mapX: 50, mapY: 50, badge: row.status, ownerId: row.owner_id, ownerName: row.owner_name, deposit: row.deposit_text, description: row.description, status: row.status, currentTenantId: row.current_tenant_id, views: row.views, contacts: row.contacts, createdAt: row.created_at })) })
})

router.put("/:listingId", async (req, res) => {
  const { saved } = z.object({ saved: z.boolean() }).parse(req.body)
  if (saved) {
    const listing = await pool.query("SELECT id FROM listings WHERE id=$1 AND status='active'", [req.params.listingId])
    if (!listing.rows[0]) return res.status(404).json({ error: "Tin phòng không còn hiển thị." })
    await pool.query("INSERT INTO favorites(user_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [req.user.id, req.params.listingId])
  } else await pool.query("DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2", [req.user.id, req.params.listingId])
  res.json({ saved })
})

export default router
