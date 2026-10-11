import { Router } from "express"
import { z } from "zod"
import ForumPost from "../models/ForumPost.js"
import { pool } from "../config/db.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
const toPost = (post) => {
  const item = post.toObject ? post.toObject({ virtuals: true }) : post
  return { id: String(item._id), authorId: item.authorId, name: item.name, initials: item.initials, time: new Date(item.createdAt).toLocaleString("vi-VN"), content: item.content, image: item.image, likes: item.likedBy.length, likedBy: item.likedBy, commentsCount: item.comments.length, comments: item.comments.map((c) => ({ id: String(c._id), authorId: c.authorId, author: c.author, initials: c.initials, text: c.text, createdAt: new Date(c.createdAt).toLocaleString("vi-VN") })), status: item.status, createdAt: item.createdAt }
}
const getIdentity = async (id) => {
  const { rows } = await pool.query("SELECT name FROM users WHERE id=$1 AND status='active'", [id])
  const name = rows[0]?.name ?? "Thành viên"
  return { name, initials: name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "TV" }
}

router.get("/", async (req, res) => {
  const query = z.object({ q: z.string().max(200).optional(), authorId: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), all: z.enum(["true", "false"]).optional() }).parse(req.query)
  const filter = query.all === "true" && req.user?.role === "admin" ? {} : { status: "active" }
  if (query.authorId) filter.authorId = query.authorId
  if (query.q) filter.content = { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
  const items = await ForumPost.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit)
  res.json({ items: items.map(toPost) })
})

router.post("/", requireAuth, async (req, res) => {
  const input = z.object({ content: z.string().trim().min(2).max(5000), image: z.string().max(2048).optional() }).parse(req.body)
  const identity = await getIdentity(req.user.id)
  const post = await ForumPost.create({ authorId: req.user.id, name: identity.name, initials: identity.initials, content: input.content, image: input.image ?? "", status: "active" })
  res.status(201).json({ item: toPost(post) })
})

router.patch("/:id", requireAuth, async (req, res) => {
  const input = z.object({ content: z.string().trim().min(2).max(5000), image: z.string().max(2048).optional() }).parse(req.body)
  const post = await ForumPost.findById(req.params.id)
  if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  if (post.authorId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bài viết này." })
  post.content = input.content
  if (input.image !== undefined) post.image = input.image
  await post.save()
  res.json({ item: toPost(post) })
})

router.delete("/:id", requireAuth, async (req, res) => {
  const post = await ForumPost.findById(req.params.id)
  if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  if (post.authorId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bài viết này." })
  await post.deleteOne()
  res.json({ message: "Đã xóa bài viết." })
})

router.post("/:id/like", requireAuth, async (req, res) => {
  const post = await ForumPost.findOne({ _id: req.params.id, status: "active" })
  if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  const index = post.likedBy.indexOf(req.user.id)
  if (index >= 0) post.likedBy.splice(index, 1)
  else post.likedBy.push(req.user.id)
  await post.save()
  res.json({ liked: index < 0, likes: post.likedBy.length })
})

router.post("/:id/comments", requireAuth, async (req, res) => {
  const input = z.object({ text: z.string().trim().min(1).max(3000) }).parse(req.body)
  const post = await ForumPost.findOne({ _id: req.params.id, status: "active" })
  if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  const identity = await getIdentity(req.user.id)
  post.comments.push({ authorId: req.user.id, author: identity.name, initials: identity.initials, text: input.text })
  await post.save()
  res.status(201).json({ item: toPost(post).comments.at(-1) })
})

router.patch("/:id/comments/:commentId", requireAuth, async (req, res) => {
  const input = z.object({ text: z.string().trim().min(1).max(3000) }).parse(req.body)
  const post = await ForumPost.findById(req.params.id)
  const comment = post?.comments.id(req.params.commentId)
  if (!comment) return res.status(404).json({ error: "Không tìm thấy bình luận." })
  if (comment.authorId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bình luận này." })
  comment.text = input.text
  await post.save()
  res.json({ item: toPost(post).comments.find((item) => item.id === req.params.commentId) })
})

router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
  const post = await ForumPost.findById(req.params.id)
  const comment = post?.comments.id(req.params.commentId)
  if (!comment) return res.status(404).json({ error: "Không tìm thấy bình luận." })
  if (comment.authorId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Bạn không sở hữu bình luận này." })
  comment.deleteOne()
  await post.save()
  res.json({ message: "Đã xóa bình luận." })
})

router.patch("/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const input = z.object({ status: z.enum(["pending", "active", "hidden", "rejected"]), moderationNote: z.string().max(1000).optional() }).parse(req.body)
  const post = await ForumPost.findByIdAndUpdate(req.params.id, { status: input.status, moderationNote: input.moderationNote ?? "" }, { new: true })
  if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết." })
  res.json({ item: toPost(post) })
})

export default router
