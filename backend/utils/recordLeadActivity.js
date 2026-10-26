import { LeadActivity } from "../models/LeadActivity.js"

export const recordLeadActivity = (owner, lead, type, title, detail = "", sourceId = null) =>
  LeadActivity.create({ owner, lead, type, title, detail, sourceId })
