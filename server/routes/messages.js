import { Router } from "express"
import { z } from "zod"
import Conversation from "../models/Conversation.js"
import { pool } from "../config/db.js"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
router.use(requireAuth, requireRole("renter", "landlord"))

const initials = (name = "Thành viên") => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "TV"
const messageTime = (date) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date)
async function formatConversation(conversation, selfId) {
  const otherId = conversation.participants.find((id) => id !== selfId)
  const [otherResult, listingResult] = await Promise.all([
    pool.query("SELECT id,name,status FROM users WHERE id=$1", [otherId]),
    conversation.listingId ? pool.query("SELECT id,title,price_vnd,image_url FROM listings WHERE id=$1", [conversation.listingId]) : Promise.resolve({ rows: [] }),
  ])
  const other = otherResult.rows[0]
  return {
    id: String(conversation._id), accountId: selfId, name: other?.name ?? "Thành viên", avatar: initials(other?.name), active: false,
    text: conversation.messages.at(-1)?.text ?? (conversation.listingId ? "Bắt đầu cuộc trò chuyện về phòng" : "Bắt đầu cuộc trò chuyện"),
    time: conversation.messages.at(-1) ? messageTime(conversation.messages.at(-1).createdAt) : messageTime(conversation.updatedAt),
    unread: conversation.messages.some((message) => message.senderId !== selfId && !message.readBy.includes(selfId)),
    muted: conversation.mutedBy.includes(selfId), roomId: conversation.listingId, userId: otherId,
    relatedListing: listingResult.rows[0] ? { id: listingResult.rows[0].id, title: listingResult.rows[0].title, price: `${(listingResult.rows[0].price_vnd / 1_000_000).toLocaleString("vi-VN")} triệu`, image: listingResult.rows[0].image_url } : null,
    messages: conversation.messages.map((message) => ({ id: String(message._id), from: message.senderId === selfId ? "me" : "them", text: message.text, time: messageTime(message.createdAt) })),
  }
}

router.get("/conversations", async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user.id }).sort({ updatedAt: -1 }).limit(100)
  res.json({ items: await Promise.all(conversations.map((item) => formatConversation(item, req.user.id))) })
})

router.post("/conversations", async (req, res) => {
  const input = z.object({ otherUserId: z.string().min(1), listingId: z.string().optional().default("") }).parse(req.body)
  if (input.otherUserId === req.user.id) return res.status(400).json({ error: "Không thể bắt đầu cuộc trò chuyện với chính mình." })
  const other = await pool.query("SELECT id FROM users WHERE id=$1 AND status='active' AND role IN ('renter','landlord')", [input.otherUserId])
  if (!other.rows[0]) return res.status(404).json({ error: "Không tìm thấy thành viên này." })
  if (input.listingId) {
    const listing = await pool.query("SELECT id,owner_id,status FROM listings WHERE id=$1", [input.listingId])
    if (!listing.rows[0] || listing.rows[0].status !== "active" || ![req.user.id, input.otherUserId].includes(listing.rows[0].owner_id)) return res.status(400).json({ error: "Phòng không phù hợp với cuộc trò chuyện." })
  }
  const participants = [req.user.id, input.otherUserId].sort()
  let conversation = await Conversation.findOne({ participants: { $all: participants, $size: 2 }, listingId: input.listingId })
  if (!conversation) conversation = await Conversation.create({ participants, listingId: input.listingId, messages: [] })
  res.status(201).json({ item: await formatConversation(conversation, req.user.id) })
})

router.get("/conversations/:id/messages", async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
  if (!conversation || !conversation.participants.includes(req.user.id)) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện." })
  res.json({ items: (await formatConversation(conversation, req.user.id)).messages })
})

router.post("/conversations/:id/messages", async (req, res) => {
  const input = z.object({ text: z.string().trim().min(1).max(4000) }).parse(req.body)
  const conversation = await Conversation.findById(req.params.id)
  if (!conversation || !conversation.participants.includes(req.user.id)) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện." })
  const otherId = conversation.participants.find((id) => id !== req.user.id)
  const other = await pool.query("SELECT status FROM users WHERE id=$1", [otherId])
  if (!other.rows[0] || other.rows[0].status !== "active") return res.status(403).json({ error: "Thành viên này hiện không thể nhận tin nhắn." })
  conversation.messages.push({ senderId: req.user.id, text: input.text, readBy: [req.user.id] })
  conversation.updatedAt = new Date()
  await conversation.save()
  const message = conversation.messages.at(-1)
  const payload = { id: String(message._id), conversationId: String(conversation._id), senderId: req.user.id, text: message.text, time: messageTime(message.createdAt), createdAt: message.createdAt }
  req.app.get("io")?.to(`conversation:${conversation.id}`).emit("message:new", payload)
  res.status(201).json({ item: { ...payload, from: "me" } })
})

router.patch("/conversations/:id/read", async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
  if (!conversation || !conversation.participants.includes(req.user.id)) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện." })
  for (const message of conversation.messages) if (message.senderId !== req.user.id && !message.readBy.includes(req.user.id)) message.readBy.push(req.user.id)
  await conversation.save()
  req.app.get("io")?.to(`conversation:${conversation.id}`).emit("conversation:read", { conversationId: conversation.id, userId: req.user.id })
  res.json({ message: "Đã đánh dấu đã đọc." })
})

router.patch("/conversations/:id/mute", async (req, res) => {
  const input = z.object({ muted: z.boolean() }).parse(req.body)
  const conversation = await Conversation.findById(req.params.id)
  if (!conversation || !conversation.participants.includes(req.user.id)) return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện." })
  conversation.mutedBy = input.muted ? [...new Set([...conversation.mutedBy, req.user.id])] : conversation.mutedBy.filter((id) => id !== req.user.id)
  await conversation.save()
  res.json({ muted: input.muted })
})

export default router
