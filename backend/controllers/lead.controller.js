import { Lead } from "../models/Lead.js"
import { LeadActivity } from "../models/LeadActivity.js"
import { Task } from "../models/Task.js"
import { Note } from "../models/Note.js"
import { recordLeadActivity } from "../utils/recordLeadActivity.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

// Get Leads
export const getLeads = asyncHandler(async (req, res) => {
  const { status, priority, source, search } = req.query

  const filter = { owner: req.user._id }

  if (status) filter.status = status
  if (priority) filter.priority = priority
  if (source) filter.source = source

  if (search) {
    const rx = new RegExp(search, "i")
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }]
  }

  const leads = await Lead.find(filter).sort({ order: 1, createdAt: -1 })

  res.json({ success: true, count: leads.length, leads })
})

// Get a single lead
export const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id })

  if (!lead) throw new ApiError(404, "Lead not found")

  res.json({ success: true, lead })
})

// Create Lead
export const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({ ...req.body, owner: req.user._id })
  await recordLeadActivity(req.user._id, lead._id, "created", "Lead created")

  res.status(201).json({ success: true, lead })
})

// Update Lead
export const updateLead = asyncHandler(async (req, res) => {
  const { owner, ...updates } = req.body
  const previous = await Lead.findOne({ _id: req.params.id, owner: req.user._id })
  if (!previous) throw new ApiError(404, "Lead not found")

  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true },
  )

  if (!lead) throw new ApiError(404, "Lead not found")

  if (previous.status !== lead.status) {
    await recordLeadActivity(req.user._id, lead._id, "stage", "Stage changed", `${previous.status} → ${lead.status}`)
  } else if (Object.keys(updates).some((key) => !["order"].includes(key))) {
    await recordLeadActivity(req.user._id, lead._id, "updated", "Lead details updated")
  }

  res.json({ success: true, lead })
})

// Delete Lead
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  })

  if (!lead) throw new ApiError(404, "Lead not found")

  await LeadActivity.deleteMany({ owner: req.user._id, lead: lead._id })

  res.json({ success: true, message: "Lead deleted" })
})

// Reorder Leads
export const reorderLeads = asyncHandler(async (req, res) => {
  const { updates } = req.body

  if (!Array.isArray(updates)) {
    throw new ApiError(400, "updates must be an array")
  }

  const existing = await Lead.find({
    _id: { $in: updates.map((u) => u.id) },
    owner: req.user._id,
  }).select("status")
  const previousStatus = new Map(existing.map((lead) => [String(lead._id), lead.status]))

  await Promise.all(
    updates.map((u) =>
      Lead.updateOne(
        { _id: u.id, owner: req.user._id },
        { $set: { status: u.status, order: u.order } },
      ),
    ),
  )

  await Promise.all(
    updates
      .filter((u) => previousStatus.has(String(u.id)) && previousStatus.get(String(u.id)) !== u.status)
      .map((u) => recordLeadActivity(
        req.user._id, u.id, "stage", "Stage changed",
        `${previousStatus.get(String(u.id))} → ${u.status}`,
      )),
  )

  res.json({ success: true, message: "Pipeline updated" })
})

export const getLeadActivities = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id }).select("createdAt")
  if (!lead) throw new ApiError(404, "Lead not found")

  const [activities, tasks, notes] = await Promise.all([
    LeadActivity.find({ owner: req.user._id, lead: lead._id })
      .sort({ createdAt: -1, _id: -1 }).limit(100).lean(),
    Task.find({ owner: req.user._id, relatedLead: lead._id })
      .sort({ createdAt: -1 }).limit(100).select("title createdAt").lean(),
    Note.find({ owner: req.user._id, lead: lead._id })
      .sort({ createdAt: -1 }).limit(100).select("content createdAt").lean(),
  ])

  const recordedSources = new Set(activities.filter((activity) => activity.sourceId).map((activity) => String(activity.sourceId)))
  for (const task of tasks) {
    if (!recordedSources.has(String(task._id))) {
      activities.push({ _id: `task-${task._id}`, type: "task", title: "Follow-up created", detail: task.title, createdAt: task.createdAt })
    }
  }
  for (const note of notes) {
    if (!recordedSources.has(String(note._id))) {
      activities.push({ _id: `note-${note._id}`, type: "note", title: "Note added", detail: note.content, createdAt: note.createdAt })
    }
  }

  // Existing leads predate the activity log.
  if (!activities.some((activity) => activity.type === "created")) {
    activities.push({ _id: `created-${lead._id}`, type: "created", title: "Lead created", detail: "", createdAt: lead.createdAt })
  }

  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ success: true, activities: activities.slice(0, 100) })
})

export const createLeadActivity = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id }).select("_id")
  if (!lead) throw new ApiError(404, "Lead not found")

  const titles = { call: "Call logged", meeting: "Meeting logged", email: "Email logged", note: "Note added" }
  const { type, detail } = req.body
  if (!Object.hasOwn(titles, type) || typeof detail !== "string" || !detail.trim() || detail.length > 2000) {
    throw new ApiError(400, "Choose an activity type and enter a note of up to 2000 characters")
  }

  const activity = await recordLeadActivity(req.user._id, lead._id, type, titles[type], detail.trim())
  res.status(201).json({ success: true, activity })
})
