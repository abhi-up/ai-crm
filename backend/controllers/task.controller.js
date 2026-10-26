import { Task } from "../models/Task.js"
import { Lead } from "../models/Lead.js"
import { recordLeadActivity } from "../utils/recordLeadActivity.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

// Get Tasks
export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, relatedLead } = req.query
  const filter = { owner: req.user._id }

  if (status) filter.status = status
  if (priority) filter.priority = priority
  if (relatedLead) filter.relatedLead = relatedLead

  const tasks = await Task.find(filter)
    .sort({ status: 1, dueDate: 1, createdAt: -1 })
    .populate("relatedLead", "name company")
    .populate("relatedContact", "name company")

  res.json({ success: true, count: tasks.length, tasks })
})

// Create Task
export const createTask = asyncHandler(async (req, res) => {
  if (req.body.relatedLead) {
    const lead = await Lead.exists({ _id: req.body.relatedLead, owner: req.user._id })
    if (!lead) throw new ApiError(404, "Linked lead not found")
  }
  const task = await Task.create({ ...req.body, owner: req.user._id })
  if (task.relatedLead) {
    await recordLeadActivity(req.user._id, task.relatedLead, "task", "Follow-up created", task.title, task._id)
  }

  res.status(201).json({ success: true, task })
})

// Update Task
export const updateTask = asyncHandler(async (req, res) => {
  const { owner, ...updates } = req.body
  const previous = await Task.findOne({ _id: req.params.id, owner: req.user._id })
  if (!previous) throw new ApiError(404, "Task not found")

  if (updates.relatedLead) {
    const lead = await Lead.exists({ _id: updates.relatedLead, owner: req.user._id })
    if (!lead) throw new ApiError(404, "Linked lead not found")
  }

  if (updates.status === "Completed" && !updates.completedAt) {
    updates.completedAt = new Date()
  }

  if (updates.status && updates.status !== "Completed") {
    updates.completedAt = null
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true },
  )

  if (!task) throw new ApiError(404, "Task not found")

  if (task.relatedLead) {
    const title = previous.status !== "Completed" && task.status === "Completed"
      ? "Follow-up completed"
      : previous.status === "Completed" && task.status !== "Completed"
        ? "Follow-up reopened"
        : String(previous.relatedLead || "") !== String(task.relatedLead)
          ? "Follow-up linked"
          : "Follow-up updated"
    await recordLeadActivity(req.user._id, task.relatedLead, "task", title, task.title)
  }

  res.json({ success: true, task })
})

// Delete Task
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  })

  if (!task) throw new ApiError(404, "Task not found")

  if (task.relatedLead) {
    await recordLeadActivity(req.user._id, task.relatedLead, "task", "Follow-up deleted", task.title)
  }

  res.json({ success: true, message: "Task deleted" })
})
