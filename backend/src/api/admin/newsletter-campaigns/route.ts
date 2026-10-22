import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  listCampaignsAdmin,
  createCampaignAdmin,
} from "../../../utils/newsletter-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const result = await listCampaignsAdmin(pgConnection)
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load campaigns." })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = (req.body as any) || {}

    const title = typeof body.title === "string" ? body.title.trim() : ""
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const previewText = typeof body.preview_text === "string" ? body.preview_text.trim() : null
    const contentHtml = typeof body.content_html === "string" ? body.content_html : ""
    const contentText =
      typeof body.content_text === "string"
        ? body.content_text
        : contentHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    const senderName = typeof body.sender_name === "string" ? body.sender_name.trim() : null
    const senderEmail = typeof body.sender_email === "string" ? body.sender_email.trim() : null
    const replyTo = typeof body.reply_to === "string" ? body.reply_to.trim() : null
    const createdBy = (req as any).auth_context?.actor_id || "admin"

    if (!title) {
      return res.status(400).json({ error: "Campaign title is required." })
    }
    if (!subject) {
      return res.status(400).json({ error: "Email subject line is required." })
    }
    if (!contentHtml) {
      return res.status(400).json({ error: "Email content is required." })
    }

    const campaign = await createCampaignAdmin(pgConnection, {
      title,
      subject,
      previewText,
      contentHtml,
      contentText,
      senderName,
      senderEmail,
      replyTo,
      createdBy,
    })

    return res.status(201).json({
      success: true,
      message: "Campaign created as draft.",
      campaign,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create campaign." })
  }
}
