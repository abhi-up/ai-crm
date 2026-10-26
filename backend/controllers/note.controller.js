import { Note } from "../models/Note.js"
import { Lead } from "../models/Lead.js"
import { recordLeadActivity } from "../utils/recordLeadActivity.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

// Get Notes
export const getNotes = asyncHandler(async (req, res) => {
  const { lead, contact, search } = req.query
  const filter = { owner: req.user._id }

  if (lead) filter.lead = lead
  if (contact) filter.contact = contact
  if (search) filter.content = new RegExp(search, "i")

  const notes = await Note.find(filter)
    .sort({ pinned: -1, createdAt: -1 })
    .populate("lead", "name company")
    .populate("contact", "name company")

  res.json({ success: true, count: notes.length, notes })
})

// Create Note
export const createNote = asyncHandler(async (req, res) => {
  const { content, lead, contact, pinned } = req.body

  if (!content) {
    throw new ApiError(400, "Note content is required")
  }
  if (lead && !(await Lead.exists({ _id: lead, owner: req.user._id }))) {
    throw new ApiError(404, "Linked lead not found")
  }

  const note = await Note.create({
    owner: req.user._id,
    content,
    lead: lead || null,
    contact: contact || null,
    pinned: Boolean(pinned),
  })
  if (note.lead) await recordLeadActivity(req.user._id, note.lead, "note", "Note added", note.content, note._id)

  res.status(201).json({ success: true, note })
})

// Update Note
export const updateNote = asyncHandler(async (req, res) => {
  const { owner, ...updates } = req.body
  if (updates.lead && !(await Lead.exists({ _id: updates.lead, owner: req.user._id }))) {
    throw new ApiError(404, "Linked lead not found")
  }

  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true },
  )

  if (!note) throw new ApiError(404, "Note not found")
  if (note.lead && updates.content) {
    await recordLeadActivity(req.user._id, note.lead, "note", "Note updated", note.content)
  }

  res.json({ success: true, note })
})

// Delete Note
export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  })

  if (!note) throw new ApiError(404, "Note not found")
  if (note.lead) await recordLeadActivity(req.user._id, note.lead, "note", "Note deleted")

  res.json({ success: true, message: "Note deleted" })
})
