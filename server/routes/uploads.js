import { Router } from "express"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { requireAuth, requireRole } from "../middleware/auth.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, done) => {
  if (!file.mimetype.startsWith("image/")) return done(new Error("Chỉ nhận tệp hình ảnh."))
  done(null, true)
} })

router.post("/image", requireAuth, requireRole("renter", "landlord"), upload.single("file"), async (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return res.status(503).json({ error: "Chưa cấu hình Cloudinary để lưu ảnh.", code: "UPLOAD_NOT_CONFIGURED" })
  if (!req.file) return res.status(400).json({ error: "Vui lòng chọn một ảnh." })
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "tro-oi", resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"] }, (error, value) => error ? reject(error) : resolve(value))
    stream.end(req.file.buffer)
  })
  res.status(201).json({ url: result.secure_url, publicId: result.public_id })
})
export default router
