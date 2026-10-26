import { Router } from "express"
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  reorderLeads,
  getLeadActivities,
  createLeadActivity,
} from "../controllers/lead.controller.js"
import { protect } from "../middleware/auth.middleware.js"

const router = Router()

router.use(protect)

router.patch("/reorder", reorderLeads)
router.route("/").get(getLeads).post(createLead)
router.route("/:id").get(getLead).put(updateLead).delete(deleteLead)
router.route("/:id/activities").get(getLeadActivities).post(createLeadActivity)

export default router
