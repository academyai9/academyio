import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  getSubscriberDetailsAdmin,
  deletePendingSubscriberAdmin,
} from "../../../../utils/newsletter-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const result = await getSubscriberDetailsAdmin(pgConnection, id)
    if (!result.subscriber) {
      return res.status(404).json({ error: "Subscriber not found." })
    }

    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load subscriber details." })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const result = await deletePendingSubscriberAdmin(pgConnection, id, adminUser)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    return res.status(200).json({ success: true, message: "Pending subscriber deleted successfully." })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete subscriber." })
  }
}
