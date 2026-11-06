import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [webinar] = await webinarService.listWebinars(
    { id },
    { relations: ["resources", "entitlements"] }
  )

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  // Fetch variant mappings
  const variants = await webinarService.listWebinarVariantMappings({ webinar_id: id })

  // If webinar has speaker_id, fetch speaker details
  let speaker = null
  if (webinar.speaker_id) {
    const [spk] = await (webinarService as any).listSpeakers({ id: webinar.speaker_id })
    speaker = spk || null
  }

  res.json({
    webinar: {
      ...webinar,
      topics_covered: webinar.topics_covered || (webinar.metadata as any)?.topics_covered || [],
      speaker,
      variants,
    },
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const body = req.body as Record<string, any>

  // Proactively ensure database columns exist on Neon PostgreSQL
  try {
    await pgConnection.raw(`
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "topics_covered" jsonb null;
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "target_audience" text null;
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "learning_objectives" jsonb null;
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "metadata" jsonb null;
    `)
  } catch (dbErr) {
    // Non-fatal if schema check fails
  }

  // Handle Duplication Action
  if (body.action === "duplicate") {
    try {
      const [existing] = await webinarService.listWebinars({ id })
      if (!existing) {
        return res.status(404).json({ message: "Webinar not found for duplication" })
      }
      const timestamp = Date.now().toString().slice(-4)
      const newSlug = `${existing.slug}-copy-${timestamp}`
      const existingTopics = existing.topics_covered || (existing.metadata as any)?.topics_covered || []

      const duplicateData: Record<string, any> = {
        title: `${existing.title} (Copy)`,
        slug: newSlug,
        short_description: existing.short_description || null,
        description: existing.description || null,
        featured_image: existing.featured_image || null,
        speaker_name: existing.speaker_name,
        speaker_title: existing.speaker_title || null,
        speaker_bio: existing.speaker_bio || null,
        speaker_photo: existing.speaker_photo || null,
        speaker_id: existing.speaker_id || null,
        event_date: existing.event_date ? new Date(existing.event_date) : new Date(),
        start_time: existing.start_time || "1:00 PM EST",
        end_time: existing.end_time || "2:40 PM EST",
        timezone: existing.timezone || "America/New_York",
        duration_minutes: existing.duration_minutes || 100,
        category: existing.category || "Federal Taxation",
        tags: existing.tags || [],
        learning_objectives: existing.learning_objectives || [],
        target_audience: existing.target_audience || null,
        topics_covered: existingTopics,
        cpe_credits: existing.cpe_credits || 2,
        max_attendees: existing.max_attendees || null,
        status: "draft",
        is_featured: false,
        is_upcoming: existing.is_upcoming !== undefined ? existing.is_upcoming : true,
        is_ondemand: existing.is_ondemand || false,
        is_seminar: false,
        refund_policy: existing.refund_policy || null,
        seo_title: `${existing.title} (Copy)`,
        seo_description: existing.seo_description || null,
        live_stream_url: existing.live_stream_url || null,
        live_instructions: existing.live_instructions || null,
        live_link_published: false,
        recording_url: existing.recording_url || null,
        recording_instructions: existing.recording_instructions || null,
        recording_expires_at: existing.recording_expires_at ? new Date(existing.recording_expires_at) : null,
        transcript_content: existing.transcript_content || null,
        transcript_file_url: existing.transcript_file_url || null,
        metadata: {
          ...((existing.metadata as any) || {}),
          topics_covered: existingTopics,
        },
      }

      let duplicatedWebinar: any = null
      try {
        duplicatedWebinar = await webinarService.createWebinars(duplicateData as any)
      } catch (err: any) {
        if (duplicateData.topics_covered !== undefined) {
          const fallbackData = { ...duplicateData }
          delete fallbackData.topics_covered
          duplicatedWebinar = await webinarService.createWebinars(fallbackData as any)
        } else {
          throw err
        }
      }

      // Duplicate variant mappings
      const existingMappings = await webinarService.listWebinarVariantMappings({ webinar_id: id })
      for (const m of existingMappings) {
        await webinarService.createWebinarVariantMappings({
          webinar_id: duplicatedWebinar.id,
          variant_id: `var_copy_${duplicatedWebinar.id.slice(-6)}_${m.option_type}`,
          title: m.title,
          description: m.description,
          price: m.price,
          currency_code: m.currency_code,
          option_type: m.option_type,
          includes_live: m.includes_live,
          includes_recording: m.includes_recording,
          includes_transcript: m.includes_transcript,
          includes_pdf: m.includes_pdf,
          is_enabled: m.is_enabled,
          order_index: m.order_index,
          expires_in_days: m.expires_in_days,
        } as any)
      }

      return res.status(201).json({
        message: "Webinar duplicated successfully as draft",
        webinar: duplicatedWebinar,
      })
    } catch (dupErr: any) {
      console.error("[Webinar Duplicate Error]:", dupErr)
      return res.status(500).json({
        message: dupErr?.message || "Failed to duplicate webinar",
      })
    }
  }

  try {
    const ALLOWED_FIELDS = [
      "title",
      "slug",
      "short_description",
      "description",
      "featured_image",
      "speaker_name",
      "speaker_bio",
      "speaker_photo",
      "speaker_title",
      "speaker_id",
      "event_date",
      "start_time",
      "end_time",
      "timezone",
      "duration_minutes",
      "category",
      "tags",
      "learning_objectives",
      "target_audience",
      "topics_covered",
      "cpe_credits",
      "registration_deadline",
      "max_attendees",
      "status",
      "is_featured",
      "is_upcoming",
      "is_ondemand",
      "is_seminar",
      "refund_policy",
      "seo_title",
      "seo_description",
      "live_stream_url",
      "live_instructions",
      "live_link_published",
      "recording_url",
      "recording_instructions",
      "recording_expires_at",
      "recording_published",
      "transcript_content",
      "transcript_file_url",
      "product_id",
      "metadata",
    ]

    const updatePayload: Record<string, any> = { id }
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        updatePayload[key] = body[key]
      }
    }

    if (body.speaker_id) {
      try {
        const [spk] = await (webinarService as any).listSpeakers({ id: body.speaker_id })
        if (spk) {
          updatePayload.speaker_name = body.speaker_name || spk.name
          updatePayload.speaker_title = body.speaker_title !== undefined ? body.speaker_title : spk.designation
          updatePayload.speaker_photo = body.speaker_photo !== undefined ? body.speaker_photo : spk.photo_url
          updatePayload.speaker_bio = body.speaker_bio !== undefined ? body.speaker_bio : spk.bio
        }
      } catch (e) {
        // ignore
      }
    }

    if (body.event_date) {
      updatePayload.event_date = new Date(body.event_date)
    }

    if (body.registration_deadline) {
      updatePayload.registration_deadline = new Date(body.registration_deadline)
    }

    if (body.recording_expires_at) {
      updatePayload.recording_expires_at = new Date(body.recording_expires_at)
    }

    // Always mirror topics_covered into metadata so data is never lost
    const topics = Array.isArray(body.topics_covered)
      ? body.topics_covered.map((t: any) => (typeof t === "string" ? t.trim() : "")).filter((t: string) => t.length > 0)
      : []
    const existingMeta = (body.metadata && typeof body.metadata === "object") ? body.metadata : {}
    updatePayload.metadata = {
      ...existingMeta,
      topics_covered: topics,
    }
    updatePayload.topics_covered = topics

    if (body.learning_objectives !== undefined) {
      updatePayload.learning_objectives = Array.isArray(body.learning_objectives)
        ? body.learning_objectives.map((o: any) => (typeof o === "string" ? o.trim() : "")).filter((o: string) => o.length > 0)
        : []
    }

    let updated: any = null
    try {
      updated = await webinarService.updateWebinars(updatePayload)
    } catch (err: any) {
      console.warn("[Webinar Update] Direct update failed, trying fallback without direct topics_covered column:", err?.message)
      if (updatePayload.topics_covered !== undefined) {
        const fallbackPayload = { ...updatePayload }
        delete fallbackPayload.topics_covered
        updated = await webinarService.updateWebinars(fallbackPayload)
      } else {
        throw err
      }
    }

    // Synchronize linked Medusa Product if available
    if (updated.product_id) {
      try {
        const productModule = req.scope.resolve(Modules.PRODUCT)
        const prodUpdate: Record<string, any> = { id: updated.product_id }
        if (body.title) prodUpdate.title = body.title
        if (body.slug) prodUpdate.handle = body.slug
        if (body.short_description || body.description) {
          prodUpdate.description = body.short_description || body.description
        }
        if (body.status) {
          prodUpdate.status = body.status === "draft" ? "draft" : "published"
        }
        if (body.featured_image) {
          prodUpdate.thumbnail = body.featured_image
        }
        await (productModule.updateProducts as any)(updated.product_id, prodUpdate)
      } catch (e) {
        // ignore product update error
      }
    }

    return res.json({ webinar: updated })
  } catch (error: any) {
    console.error("[Webinar Update Error]:", error)
    return res.status(500).json({
      message: error?.message || "Failed to update webinar. Please check data format.",
      detail: error?.detail || null,
    })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const productModule = req.scope.resolve(Modules.PRODUCT)
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    // 1. Check if webinar exists
    const [webinar] = await webinarService.listWebinars({ id }).catch(() => [])
    if (!webinar) {
      return res.status(404).json({ message: `Webinar with ID "${id}" was not found.` })
    }

    // 2. Cascade delete dependent child records individually in PostgreSQL
    // To prevent "cannot insert multiple commands into a prepared statement" and FK constraint violations:
    await pgConnection.raw(
      `DELETE FROM quiz_question WHERE quiz_id IN (SELECT id FROM webinar_quiz WHERE webinar_id = ?)`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM quiz_attempt WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinar_certificate WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinar_quiz WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinar_resource WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinar_variant_mapping WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM customer_entitlement WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinar_file WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinar_credit_info WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    await pgConnection.raw(
      `DELETE FROM webinarmodule_webinar_product_product WHERE webinar_id = ?`,
      [id]
    ).catch(() => {})

    // 3. Delete the webinar row itself
    await pgConnection.raw(`DELETE FROM webinar WHERE id = ?`, [id])

    // 4. Clean up Medusa product if linked
    if (webinar.product_id) {
      try {
        await (productModule.deleteProducts as any)([webinar.product_id])
      } catch (prodErr: any) {
        console.warn(`[Delete Webinar] Notice: linked product ${webinar.product_id} was not deleted:`, prodErr.message)
      }
    }

    return res.status(200).json({
      id,
      object: "webinar",
      deleted: true,
      message: `Webinar "${webinar.title}" deleted successfully.`
    })
  } catch (error: any) {
    console.error("[Delete Webinar Error]:", error)
    return res.status(500).json({
      message: error.message || "Failed to delete webinar due to database constraint.",
      detail: error.detail || null
    })
  }
}
