import { Router } from "express"
import { pool } from "../config/db.js"

const router = Router()
router.get("/", async (_req, res) => {
  const { rows } = await pool.query(`SELECT r.id,r.listing_id,r.author_id,u.name AS author,r.stars,r.text,r.created_at
    FROM reviews r JOIN users u ON u.id=r.author_id JOIN listings l ON l.id=r.listing_id
    WHERE l.status IN ('active','rented') ORDER BY r.created_at DESC`)
  res.json({ items: rows.map((row) => ({ id: row.id, listingId: row.listing_id, authorId: row.author_id, author: row.author, initials: row.author.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase(), stars: row.stars, text: row.text, createdAt: row.created_at })) })
})
export default router
