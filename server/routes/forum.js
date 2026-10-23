import { Router } from "express"
import { z } from "zod"
import { pool } from "../config/db.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
export const forumSelect = `SELECT p.*,u.name AS author_name,
  COALESCE((SELECT json_agg(json_build_object(
    'id',c.id,'authorId',c.author_id,'author',cu.name,'initials',upper(left(cu.name,2)),
    'text',c.content,'createdAt',c.created_at
  ) ORDER BY c.created_at) FROM forum_comments c JOIN users cu ON cu.id=c.author_id
    WHERE c.post_id=p.id AND c.is_hidden=false),'[]'::json) AS comments,
  COALESCE((SELECT json_agg(r.user_id ORDER BY r.created_at) FROM forum_reactions r WHERE r.post_id=p.id),'[]'::json) AS liked_by
  FROM forum_posts p JOIN users u ON u.id=p.author_id`

export const asForumPost = (row) => ({
  id: row.id,
  authorId: row.author_id,
  name: row.author_name,
  initials: row.author_name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "TV",
  time: new Date(row.created_at).toLocaleString("vi-VN"),
  content: row.content,
  image: row.image_url,
  likes: row.liked_by.length,
  likedBy: row.liked_by,
  commentsCount: row.comments.length,
  comments: row.comments,
  status: row.status,
  moderationNote: row.moderation_note,
  createdAt: row.created_at,
})

export async function findForumPost(id, client = pool) {
  const { rows } = await client.query(`${forumSelect} WHERE p.id=$1 LIMIT 1`, [id])
  return rows[0] ?? null
}

router.get("/", async (req, res) => {
  const query = z.object({ q: z.string().max(200).optional(), authorId: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), all: z.enum(["true", "false"]).optional() }).parse(req.query)
  const filters = query.all === "true" && req.user?.role === "admin" ? [] : ["p.status='active'"]
  const values = []
  if (query.authorId) { values.push(query.authorId); filters.push(`p.author_id=$${values.length}`) }
  if (query.q) { values.push(`%${query.q}%`); filters.push(`unaccent(p.content) ILIKE unaccent($${values.length})`) }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
  values.push(query.limit, (query.page - 1) * query.limit)
  const { rows } = await pool.query(`${forumSelect} ${where} ORDER BY p.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values)
  res.json({ items: rows.map(asForumPost) })
})

router.post("/", requireAuth, async (req, res) => {
  const input = z.object({ content: z.string().trim().min(2).max(5000), image: z.string().max(2048).optional() }).parse(req.body)
  const { rows } = await pool.query("INSERT INTO forum_posts(author_id,content,image_url,status) VALUES($1,$2,$3,'active') RETURNING id", [req.user.id, input.content, input.image ?? ""])
  res.status(201).json({ item: asForumPost(await findForumPost(rows[0].id)) })
})

router.patch("/:id", requireAuth, async (req, res) => {
  const input = z.object({ content: z.string().trim().min(2).max(5000), image: z.string().max(2048).optional() }).parse(req.body)
  const found = await pool.query("SELECT author_id FROM forum_posts WHERE id=$1", [req.params.id])
  if (!found.rows[0]) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  if (found.rows[0].author_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bài viết này." })
  await pool.query("UPDATE forum_posts SET content=$2,image_url=coalesce($3,image_url),updated_at=now() WHERE id=$1", [req.params.id, input.content, input.image])
  res.json({ item: asForumPost(await findForumPost(req.params.id)) })
})

router.delete("/:id", requireAuth, async (req, res) => {
  const found = await pool.query("SELECT author_id FROM forum_posts WHERE id=$1", [req.params.id])
  if (!found.rows[0]) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  if (found.rows[0].author_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bài viết này." })
  await pool.query("DELETE FROM forum_posts WHERE id=$1", [req.params.id])
  res.json({ message: "Đã xóa bài viết." })
})

router.post("/:id/like", requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const post = await client.query("SELECT id FROM forum_posts WHERE id=$1 AND status='active' FOR UPDATE", [req.params.id])
    if (!post.rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Không tìm thấy bài viết." }) }
    const removed = await client.query("DELETE FROM forum_reactions WHERE post_id=$1 AND user_id=$2 RETURNING post_id", [req.params.id, req.user.id])
    const liked = !removed.rowCount
    if (liked) await client.query("INSERT INTO forum_reactions(post_id,user_id) VALUES($1,$2)", [req.params.id, req.user.id])
    const count = await client.query("SELECT count(*)::int AS count FROM forum_reactions WHERE post_id=$1", [req.params.id])
    await client.query("COMMIT")
    res.json({ liked, likes: count.rows[0].count })
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally { client.release() }
})

router.post("/:id/comments", requireAuth, async (req, res) => {
  const input = z.object({ text: z.string().trim().min(1).max(3000) }).parse(req.body)
  const { rows } = await pool.query(`INSERT INTO forum_comments(post_id,author_id,content) SELECT id,$2,$3 FROM forum_posts WHERE id=$1 AND status='active' RETURNING id,author_id,content,created_at`, [req.params.id, req.user.id, input.text])
  if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  const author = await pool.query("SELECT name FROM users WHERE id=$1", [req.user.id])
  res.status(201).json({ item: { id: rows[0].id, authorId: rows[0].author_id, author: author.rows[0].name, initials: author.rows[0].name.slice(0, 2).toUpperCase(), text: rows[0].content, createdAt: rows[0].created_at } })
})

router.patch("/:id/comments/:commentId", requireAuth, async (req, res) => {
  const input = z.object({ text: z.string().trim().min(1).max(3000) }).parse(req.body)
  const found = await pool.query("SELECT author_id FROM forum_comments WHERE id=$1 AND post_id=$2", [req.params.commentId, req.params.id])
  if (!found.rows[0]) return res.status(404).json({ error: "Không tìm thấy bình luận." })
  if (found.rows[0].author_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bình luận này." })
  await pool.query("UPDATE forum_comments SET content=$2,updated_at=now() WHERE id=$1", [req.params.commentId, input.text])
  const post = asForumPost(await findForumPost(req.params.id))
  res.json({ item: post.comments.find((item) => item.id === req.params.commentId) })
})

router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
  const found = await pool.query("SELECT author_id FROM forum_comments WHERE id=$1 AND post_id=$2", [req.params.commentId, req.params.id])
  if (!found.rows[0]) return res.status(404).json({ error: "Không tìm thấy bình luận." })
  if (found.rows[0].author_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bình luận này." })
  await pool.query("DELETE FROM forum_comments WHERE id=$1", [req.params.commentId])
  res.json({ message: "Đã xóa bình luận." })
})

router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const input = z.object({ status: z.enum(["pending", "active", "hidden", "rejected"]), moderationNote: z.string().max(1000).optional() }).parse(req.body)
  const result = await pool.query("UPDATE forum_posts SET status=$2,moderation_note=$3,updated_at=now() WHERE id=$1 RETURNING id", [req.params.id, input.status, input.moderationNote ?? ""])
  if (!result.rowCount) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  res.json({ item: asForumPost(await findForumPost(req.params.id)) })
})

export default router
