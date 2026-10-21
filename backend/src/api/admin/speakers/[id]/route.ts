import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [speaker] = await (webinarService as any).listSpeakers({ id })
  if (!speaker) {
    return res.status(404).json({ message: "Speaker not found" })
  }

  const webinars = await webinarService.listWebinars(
    { speaker_id: id },
    { order: { event_date: "DESC" } }
  )

  res.json({
    speaker: {
      ...speaker,
      is_featured: Boolean(speaker.is_featured),
      featured_order: Number(speaker.featured_order) || 0,
      specialty: speaker.specialty || (speaker.metadata as any)?.specialty || null,
      webinars,
      webinars_count: webinars.length,
    },
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const [current] = await (webinarService as any).listSpeakers({ id })
  if (!current) {
    return res.status(404).json({ message: "Speaker not found" })
  }

  const updatePayload: Record<string, any> = { id }

  if (body.name !== undefined) updatePayload.name = body.name
  if (body.slug !== undefined) updatePayload.slug = body.slug
  if (body.bio !== undefined) updatePayload.bio = body.bio
  if (body.designation !== undefined) updatePayload.designation = body.designation
  if (body.qualifications !== undefined) updatePayload.qualifications = body.qualifications
  if (body.photo_url !== undefined) updatePayload.photo_url = body.photo_url
  if (body.email !== undefined) updatePayload.email = body.email
  if (body.phone !== undefined) updatePayload.phone = body.phone
  if (body.status !== undefined) updatePayload.status = body.status
  if (body.is_featured !== undefined) updatePayload.is_featured = Boolean(body.is_featured)
  if (body.featured_order !== undefined) updatePayload.featured_order = Number(body.featured_order)
  if (body.specialty !== undefined) updatePayload.specialty = body.specialty

  const updatedMetadata = {
    ...(current.metadata || {}),
    ...(body.metadata || {}),
    is_featured: updatePayload.is_featured !== undefined ? updatePayload.is_featured : current.is_featured,
    featured_order: updatePayload.featured_order !== undefined ? updatePayload.featured_order : current.featured_order,
    specialty: updatePayload.specialty !== undefined ? updatePayload.specialty : current.specialty,
  }
  updatePayload.metadata = updatedMetadata

  const updated = await (webinarService as any).updateSpeakers(updatePayload)

  // If name, bio, or photo changed, optionally sync with associated webinars
  if (body.name || body.designation || body.photo_url || body.bio) {
    const associatedWebinars = await webinarService.listWebinars({ speaker_id: id })
    for (const w of associatedWebinars) {
      await webinarService.updateWebinars({
        id: w.id,
        speaker_name: body.name || w.speaker_name,
        speaker_title: body.designation !== undefined ? body.designation : w.speaker_title,
        speaker_photo: body.photo_url !== undefined ? body.photo_url : w.speaker_photo,
        speaker_bio: body.bio !== undefined ? body.bio : w.speaker_bio,
      })
    }
  }

  res.json({
    speaker: {
      ...updated,
      is_featured: Boolean(updated.is_featured),
      featured_order: Number(updated.featured_order) || 0,
      specialty: updated.specialty || (updated.metadata as any)?.specialty || null,
    },
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const query = req.query as Record<string, any>

  // Check if speaker is associated with existing webinars
  const associatedWebinars = await webinarService.listWebinars({ speaker_id: id })
  if (associatedWebinars.length > 0 && query.force !== "true") {
    return res.status(400).json({
      message: `Cannot delete speaker because they are assigned to ${associatedWebinars.length} webinar(s). Please archive the speaker or reassign the webinars first.`,
      associated_webinars_count: associatedWebinars.length,
      associated_webinars: associatedWebinars.map((w) => ({ id: w.id, title: w.title })),
    })
  }

  // If force delete or archived, safely reassign or soft delete
  if (query.archive === "true") {
    const archived = await (webinarService as any).updateSpeakers({
      id,
      status: "archived",
      is_featured: false,
    })
    return res.json({ id, object: "speaker", status: "archived", archived: true })
  }

  await (webinarService as any).deleteSpeakers([id])
  res.json({ id, object: "speaker", deleted: true })
}
