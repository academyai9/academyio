import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const customerId = (req as any).auth_context?.actor_id
  const { id: webinarId } = req.params

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to access webinar content" })
  }

  // 1. Check direct customer entitlements for this webinar
  const entitlements = await webinarService.listCustomerEntitlements({
    customer_id: customerId,
    webinar: { id: webinarId },
    status: "active",
  })

  // 2. Check active customer monthly subscription
  const activeSubs = await webinarService.listCustomerSubscriptions({
    customer_id: customerId,
    status: "active",
  })

  const now = new Date()
  const validSub = activeSubs.find(
    (sub) => new Date(sub.current_period_end) > now
  )

  let plan: any = null
  if (validSub) {
    const [p] = await webinarService.listSubscriptionPlans({ id: validSub.plan_id })
    if (p && p.status === "active") {
      plan = p
    }
  }

  const hasEntitlements = entitlements && entitlements.length > 0
  const hasSubscription = Boolean(plan)

  if (!hasEntitlements && !hasSubscription) {
    return res.status(403).json({
      message: "Access denied. You do not own an active entitlement or subscription for this webinar.",
      entitled: false,
    })
  }

  // Retrieve full webinar record (including private administrative links)
  const [webinar] = await webinarService.listWebinars(
    { id: webinarId },
    { relations: ["resources"] }
  )

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  // 3. Evaluate specific access permissions
  let hasLive = false
  let hasRecording = false
  let hasTranscript = false
  let hasPdf = false

  // Grant permissions from direct entitlements
  for (const ent of (entitlements || []) as any[]) {
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

  // Grant permissions from active monthly subscription plan
  if (plan) {
    if (plan.includes_live) hasLive = true
    if (plan.includes_recording) hasRecording = true
    if (plan.includes_transcript) hasTranscript = true
    if (plan.includes_pdf) hasPdf = true
  }

  // 4. Construct authorized content payload strictly based on verified permissions
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
    access: {
      has_live: hasLive,
      has_recording: hasRecording,
      has_transcript: hasTranscript,
      has_pdf: hasPdf,
    },
    subscription_access: Boolean(plan),
  }

  // Live Webinar Content Delivery
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

  // Recording Delivery
  if (hasRecording) {
    const recordingExpired = webinar.recording_expires_at && new Date(webinar.recording_expires_at) < now
    const isRecordingPublished = Boolean(webinar.recording_published)
    if (webinar.recording_url && isRecordingPublished && !recordingExpired) {
      accessPayload.recording = {
        available: true,
        recording_url: webinar.recording_url,
        instructions: webinar.recording_instructions || "High-definition recorded video session with playback controls.",
        expires_at: webinar.recording_expires_at,
      }
    } else {
      accessPayload.recording = {
        available: false,
        status: recordingExpired ? "expired" : (!isRecordingPublished ? "recording_pending" : "processing"),
        instructions: recordingExpired
          ? "Recording access expired."
          : !isRecordingPublished
          ? "The live event has concluded. The recording is currently being processed and will be published by the organizer soon."
          : "Recording is being processed.",
      }
    }
  }

  // Transcript Delivery
  if (hasTranscript) {
    accessPayload.transcript = {
      available: Boolean(webinar.transcript_file_url || webinar.transcript_content),
      file_url: webinar.transcript_file_url,
      content: webinar.transcript_content,
    }
  }

  // PDF Resource Delivery
  if (hasPdf) {
    const pdfList = (webinar.resources || [])
      .filter((r: any) => r.is_published)
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        file_url: r.file_url,
        file_name: r.file_name,
        file_size: r.file_size,
        access_type: r.access_type,
      }))
    accessPayload.resources = pdfList
    accessPayload.pdf_resources = { resources: pdfList }
  }

  res.json(accessPayload)
}
