import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 4000 },
  readBy: { type: [String], default: [] },
}, { timestamps: true })

const conversationSchema = new mongoose.Schema({
  participants: { type: [String], required: true, validate: (value) => value.length === 2 },
  listingId: { type: String, default: "" },
  transferId: { type: String, default: "" },
  mutedBy: { type: [String], default: [] },
  messages: { type: [messageSchema], default: [] },
}, { timestamps: true })

conversationSchema.index({ participants: 1, updatedAt: -1 })
export default mongoose.model("Conversation", conversationSchema)
