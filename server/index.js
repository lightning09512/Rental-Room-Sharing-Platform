import "dotenv/config"
import http from "node:http"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import { rateLimit } from "express-rate-limit"
import { Server as SocketServer } from "socket.io"
import jwt from "jsonwebtoken"
import { pool, connectMongo, databaseStatus, requirePostgres, requireMongo } from "./config/db.js"
import Conversation from "./models/Conversation.js"
import { notFound, errorHandler } from "./middleware/errors.js"
import authRoutes from "./routes/auth.js"
import listingRoutes from "./routes/listings.js"
import favoriteRoutes from "./routes/favorites.js"
import forumRoutes from "./routes/forum.js"
import messageRoutes from "./routes/messages.js"
import reportRoutes from "./routes/reports.js"
import notificationRoutes from "./routes/notifications.js"
import adminRoutes from "./routes/admin.js"
import categoryRoutes from "./routes/categories.js"
import uploadRoutes from "./routes/uploads.js"
import memberRoutes from "./routes/members.js"
import reviewRoutes from "./routes/reviews.js"
import transferRoutes from "./routes/transfers.js"
import { requireAuth } from "./middleware/auth.js"
import { flushNotificationOutbox } from "./services/notificationService.js"

const app = express()
const server = http.createServer(app)
const configuredOrigins = (process.env.WEB_ORIGIN || "http://localhost:8443").split(",").map((value) => value.trim())
const io = new SocketServer(server, { cors: { origin: configuredOrigins, credentials: true }, maxHttpBufferSize: 1e6 })
app.set("io", io)
app.disable("x-powered-by")
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(cors({ origin(origin, done) {
  if (!origin || configuredOrigins.includes(origin)) return done(null, true)
  done(new Error("Origin không được phép."))
}, credentials: true }))
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: false, limit: "1mb" }))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau." } })
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau." } })
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Bạn đã yêu cầu quá nhiều mã. Vui lòng đợi trước khi thử lại." } })
app.use("/api", apiLimiter)
app.get("/api/health", async (_req, res) => {
  const databases = await databaseStatus()
  const configured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32)
  const ready = databases.postgres === "connected" && databases.mongo === "connected" && configured
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "configuration_required", databases, authConfigured: configured, emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM), uploadsConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) })
})

app.use("/api/auth", authLimiter, (req, res, next) => req.path === "/password-reset/request" ? resetLimiter(req, res, next) : next(), requirePostgres, authRoutes)
app.use("/api/listings", requirePostgres, listingRoutes)
app.use("/api/transfers", requirePostgres, transferRoutes)
app.use("/api/favorites", requirePostgres, favoriteRoutes)
app.use("/api/forum", requirePostgres, (req, res, next) => { if (req.get("authorization")) return requireAuth(req, res, next); next() }, forumRoutes)
app.use("/api/messages", requirePostgres, requireMongo, messageRoutes)
app.use("/api/reports", requirePostgres, reportRoutes)
app.use("/api/notifications", requirePostgres, requireMongo, notificationRoutes)
app.use("/api/admin", requirePostgres, adminRoutes)
app.use("/api/categories", requirePostgres, categoryRoutes)
app.use("/api/uploads", requirePostgres, uploadRoutes)
app.use("/api/members", requirePostgres, memberRoutes)
app.use("/api/reviews", requirePostgres, reviewRoutes)
app.use(notFound)
app.use(errorHandler)

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return next(new Error("unauthorized"))
    const claims = jwt.verify(token, process.env.JWT_SECRET)
    if (!pool) return next(new Error("database_unavailable"))
    const { rows } = await pool.query("SELECT id,role,status FROM users WHERE id=$1", [claims.sub])
    if (!rows[0] || rows[0].status !== "active" || !["renter", "landlord"].includes(rows[0].role)) return next(new Error("unauthorized"))
    socket.data.user = { id: rows[0].id, role: rows[0].role }
    next()
  } catch { next(new Error("unauthorized")) }
})
io.on("connection", (socket) => {
  socket.on("conversation:join", async (conversationId, acknowledge) => {
    try {
      const conversation = await Conversation.findById(conversationId).select("participants")
      if (!conversation || !conversation.participants.includes(socket.data.user.id)) return acknowledge?.({ ok: false, error: "forbidden" })
      socket.join(`conversation:${conversation.id}`)
      acknowledge?.({ ok: true })
    } catch { acknowledge?.({ ok: false, error: "not_found" }) }
  })
  socket.on("conversation:leave", (conversationId) => socket.leave(`conversation:${conversationId}`))
})

const port = Number(process.env.PORT || 3001)
server.listen(port, "0.0.0.0", () => console.log(`Tro Oi API listening on ${port}`))
if (pool) pool.query("SELECT 1").catch((error) => console.warn(`PostgreSQL unavailable: ${error.message}`))
connectMongo()
  .then(() => flushNotificationOutbox().catch((error) => console.warn(`Notification outbox unavailable: ${error.message}`)))
  .catch((error) => console.warn(`MongoDB unavailable: ${error.message}`))

async function shutdown() {
  io.close()
  server.close()
  if (pool) await pool.end()
  process.exit(0)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
