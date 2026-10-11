import mongoose from "mongoose"

const commentSchema = new mongoose.Schema({
  authorId: { type: String, required: true, index: true },
  author: { type: String, required: true },
  initials: { type: String, default: "TV" },
  text: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: true })

const forumPostSchema = new mongoose.Schema({
  authorId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  initials: { type: String, default: "TV" },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  image: { type: String, default: "" },
  likedBy: { type: [String], default: [] },
  comments: { type: [commentSchema], default: [] },
  status: { type: String, enum: ["pending", "active", "hidden", "rejected"], default: "active", index: true },
  moderationNote: { type: String, default: "" },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

forumPostSchema.virtual("likes").get(function () { return this.likedBy.length })
forumPostSchema.virtual("commentsCount").get(function () { return this.comments.length })
export default mongoose.model("ForumPost", forumPostSchema)
