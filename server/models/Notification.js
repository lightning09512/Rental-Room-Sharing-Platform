import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema({
  sourceId: { type: String, unique: true, sparse: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  detail: { type: String, required: true, trim: true, maxlength: 3000 },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true })

notificationSchema.index({ userId: 1, createdAt: -1 })
export default mongoose.model("Notification", notificationSchema)
