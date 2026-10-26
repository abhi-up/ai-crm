import mongoose from "mongoose"

const leadActivitySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    type: {
      type: String,
      enum: ["created", "updated", "stage", "note", "task", "call", "meeting", "email"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    detail: { type: String, default: "", trim: true },
  },
  { timestamps: true },
)

leadActivitySchema.index({ owner: 1, lead: 1, createdAt: -1 })

export const LeadActivity = mongoose.model("LeadActivity", leadActivitySchema)
