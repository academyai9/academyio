import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const customerId = (req as any).auth_context?.actor_id || (req.query.customer_id as string)
  const { id: webinarId } = req.params

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to access webinar content" })
  }

  // 1. Verify customer entitlements for this webinar
  const entitlements = await webinarService.listCustomerEntitlements({
    customer_id: customerId,
    webinar: { id: webinarId },
    status: "active",
  })

  if (!entitlements || entitlements.length === 0) {
    return res.status(403).json({
      message: "Access denied. You do not own an active entitlement for this webinar.",
      entitled: false,
    })
  }

  // Retrieve the full webinar record (including private administrative links)
  const [webinar] = await webinarService.listWebinars(
    { id: webinarId },
    { relations: ["resources"] }
  )

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  // 2. Evaluate specific access permissions
  let hasLive = false
  let hasRecording = false
  let hasTranscript = false
  let hasPdf = false

  const now = new Date()

  for (const ent of entitlements as any[]) {
    // Check if expired
    if (ent.expires_at && new Date(ent.expires_at) < now) {
      continue
    }

    if (ent.access_type === "bundle") {
      hasLive = true
      hasRecording = true
      hasTranscript = true
      hasPdf = true
    } else if (ent.access_type === "live") {
      hasLive = true
    } else if (ent.access_type === "recording") {
      hasRecording = true
    } else if (ent.access_type === "transcript") {
      hasTranscript = true
    } else if (ent.access_type === "pdf") {
      hasPdf = true
    }
  }

  // 3. Construct authorized content payload strictly based on verified permissions
  const accessPayload: Record<string, any> = {
    webinar_id: webinar.id,
    title: webinar.title,
    speaker_name: webinar.speaker_name,
    speaker_bio: webinar.speaker_bio,
    speaker_photo: webinar.speaker_photo,
    event_date: webinar.event_date,
    start_time: webinar.start_time,
    end_time: webinar.end_time,
    timezone: webinar.timezone,
    learning_objectives: webinar.learning_objectives,
    cpe_credits: webinar.cpe_credits,
    permissions: {
      can_access_live: hasLive,
      can_access_recording: hasRecording,
      can_access_transcript: hasTranscript,
      can_access_pdf: hasPdf,
    },
  }

  // Live Webinar Content Delivery: Only if customer has live entitlement AND link is published
  if (hasLive) {
    if (webinar.live_link_published && webinar.live_stream_url) {
      accessPayload.live = {
        available: true,
        stream_url: webinar.live_stream_url,
        instructions: webinar.live_instructions || "Please join 5-10 minutes prior to scheduled start time.",
      }
    } else {
      accessPayload.live = {
        available: false,
        status: "pending_publication",
        instructions: webinar.live_instructions || "The live joining link will be published by the organizer prior to event start.",
      }
    }
  }

  // Recording Delivery: Only if customer has recording entitlement
  if (hasRecording) {
    const recordingExpired = webinar.recording_expires_at && new Date(webinar.recording_expires_at) < now
    if (webinar.recording_url && !recordingExpired) {
      accessPayload.recording = {
        available: true,
        recording_url: webinar.recording_url,
        instructions: webinar.recording_instructions || "High-definition recorded video session with playback controls.",
        expires_at: webinar.recording_expires_at,
      }
    } else if (recordingExpired) {
      accessPayload.recording = {
        available: false,
        status: "expired",
        instructions: "Recording access window has ended.",
      }
    } else {
      accessPayload.recording = {
        available: false,
        status: "processing",
        instructions: "Recording is currently being processed and will be available within 24 hours of live broadcast.",
      }
    }
  }

  // Transcript Delivery: Only if customer has transcript entitlement
  if (hasTranscript) {
    if (webinar.transcript_file_url || webinar.transcript_content) {
      accessPayload.transcript = {
        available: true,
        content: webinar.transcript_content || null,
        download_url: webinar.transcript_file_url || null,
      }
    } else {
      accessPayload.transcript = {
        available: false,
        status: "in_transcription",
        instructions: "Full verified transcript is being prepared and will be published shortly.",
      }
    }
  }

  // PDF Downloads Delivery: Only if customer has PDF entitlement
  if (hasPdf) {
    const resources = ((webinar as any).resources || [])
      .filter((r: any) => r.is_published)
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        file_name: r.file_name,
        file_size: r.file_size,
        file_type: r.file_type,
        access_type: r.access_type,
        download_url: `/store/customer/resources/${r.id}/download`,
      }))

    accessPayload.pdf_resources = {
      available: resources.length > 0,
      resources,
    }
  }

  res.json(accessPayload)
}
