import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id: webinarId } = req.params

    const customerId = (req as any).auth_context?.actor_id

    if (!customerId) {
      return res.status(401).json({
        message: "Authentication required",
        is_authenticated: false,
        has_active_subscription: false,
        is_registered: false,
        can_register_free: false,
      })
    }

    // 1. Fetch webinar
    const [webinar] = await webinarService.listWebinars({ id: webinarId }, { relations: ["resources"] })
    if (!webinar) {
      return res.status(404).json({ message: "Webinar not found" })
    }

    // 2. Check direct entitlements (both subscription and order)
    const entFilter: Record<string, any> = { webinar: { id: webinarId }, status: "active" }
    if (customerId) entFilter.customer_id = customerId

    const entitlements = await webinarService.listCustomerEntitlements(entFilter)

    const now = new Date()
    const activeEntitlements = (entitlements || []).filter(
      (ent: any) => !ent.expires_at || new Date(ent.expires_at) > now
    )
    const isRegistered = activeEntitlements.length > 0
    const activeEnt = isRegistered ? activeEntitlements[0] : null

    // 3. Check customer subscription
    const activeSubs = await webinarService.listCustomerSubscriptions({
      customer_id: customerId,
      status: "active",
    })

    const validSub = (activeSubs || []).find((s: any) => new Date(s.current_period_end) > now)

    let plan: any = null
    let isIncludedInPlan = false
    let limitReached = false
    let canRegisterFree = false

    if (validSub) {
      const [p] = await webinarService.listSubscriptionPlans({ id: validSub.plan_id })
      if (p && p.status === "active") {
        plan = p

        // Check plan scope & exclusions
        const scope = p.metadata?.plan_scope || "all_webinars"
        if (scope === "selected_webinars") {
          const incIds = (p.metadata?.included_webinar_ids as string[]) || []
          isIncludedInPlan = Array.isArray(incIds) && incIds.includes(webinarId)
        } else {
          const excIds = (p.metadata?.excluded_webinar_ids as string[]) || []
          isIncludedInPlan = !Array.isArray(excIds) || !excIds.includes(webinarId)
        }

        // Check limit
        if (p.webinar_access_limit !== null && p.webinar_access_limit !== undefined && p.webinar_access_limit > 0) {
          limitReached = (validSub.monthly_access_used || 0) >= p.webinar_access_limit
        }

        canRegisterFree = isIncludedInPlan && (!limitReached || isRegistered)
      }
    }

    // Evaluate permissions
    let hasLive = false
    let hasRecording = false
    let hasTranscript = false
    let hasPdf = false

    if (isRegistered && activeEnt) {
      if (activeEnt.access_type === "bundle") {
        hasLive = true
        hasRecording = true
        hasTranscript = true
        hasPdf = true
      } else {
        if (activeEnt.access_type === "live") hasLive = true
        if (activeEnt.access_type === "recording") hasRecording = true
        if (activeEnt.access_type === "transcript") hasTranscript = true
        if (activeEnt.access_type === "pdf") hasPdf = true
      }
    } else if (validSub && plan && isIncludedInPlan) {
      hasLive = Boolean(plan.includes_live)
      hasRecording = Boolean(plan.includes_recording)
      hasTranscript = Boolean(plan.includes_transcript)
      hasPdf = Boolean(plan.includes_pdf)
    }

    // Protected materials when entitled
    let materials: Record<string, any> | null = null
    if (isRegistered || (validSub && isIncludedInPlan)) {
      materials = {
        live_stream_url: hasLive && webinar.live_link_published ? webinar.live_stream_url : null,
        live_instructions: hasLive ? webinar.live_instructions : null,
        recording_url: hasRecording && (webinar.recording_published || (webinar as any).recording_ready) ? webinar.recording_url : null,
        recording_instructions: hasRecording ? webinar.recording_instructions : null,
        transcript_file_url: hasTranscript ? webinar.transcript_file_url : null,
        transcript_content: hasTranscript ? webinar.transcript_content : null,
        resources: hasPdf ? (webinar.resources || []).filter((r: any) => r.is_published) : [],
      }
    }

    res.json({
      is_authenticated: true,
      has_active_subscription: Boolean(validSub),
      subscription: validSub
        ? {
            id: validSub.id,
            plan_id: validSub.plan_id,
            plan_name: validSub.plan_name,
            current_period_end: validSub.current_period_end,
            monthly_access_used: validSub.monthly_access_used || 0,
            access_limit: plan?.webinar_access_limit || null,
          }
        : null,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            includes_live: plan.includes_live,
            includes_recording: plan.includes_recording,
            includes_transcript: plan.includes_transcript,
            includes_pdf: plan.includes_pdf,
            webinar_access_limit: plan.webinar_access_limit,
          }
        : null,
      is_webinar_included: isIncludedInPlan,
      is_registered: isRegistered,
      entitlement_source:
        activeEnt?.metadata?.source === "subscription" || activeEnt?.order_id?.startsWith("SUB_")
          ? "subscription"
          : activeEnt
          ? "direct_purchase"
          : null,
      can_register_free: canRegisterFree,
      limit_reached: limitReached,
      access_permissions: {
        has_live: hasLive,
        has_recording: hasRecording,
        has_transcript: hasTranscript,
        has_pdf: hasPdf,
      },
      materials,
    })
  } catch (error: any) {
    console.error("[Subscription Status Error]:", error)
    res.status(500).json({ message: "Failed to evaluate subscription status", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id: webinarId } = req.params
    const body = (req.body as Record<string, any>) || {}

    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) {
      return res.status(401).json({ message: "Authentication required to register for webinars with your subscription." })
    }

    let customerEmail: string | null = null
    const custRes = await pgConnection.raw(
      `SELECT id, email FROM customer WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      [customerId]
    )
    if (custRes.rows?.[0]) {
      customerEmail = custRes.rows[0].email
    }

    // 1. Fetch webinar
    const [webinar] = await webinarService.listWebinars({ id: webinarId })
    if (!webinar) {
      return res.status(404).json({ message: "Webinar not found" })
    }

    // 2. Fetch active customer subscription
    const activeSubs = await webinarService.listCustomerSubscriptions({
      customer_id: customerId,
      status: "active",
    })

    const now = new Date()
    const validSub = (activeSubs || []).find((s: any) => new Date(s.current_period_end) > now)

    if (!validSub) {
      return res.status(403).json({
        message: "No active subscription found. Please subscribe to register for webinars with inclusive membership pricing.",
        error: "NO_ACTIVE_SUBSCRIPTION",
      })
    }

    // 3. Fetch plan details
    const [plan] = await webinarService.listSubscriptionPlans({ id: validSub.plan_id })
    if (!plan || plan.status !== "active") {
      return res.status(403).json({
        message: "Your subscription plan is currently unavailable or inactive.",
        error: "PLAN_INACTIVE",
      })
    }

    // 4. Verify plan scope & exclusions
    const scope = plan.metadata?.plan_scope || "all_webinars"
    let isIncluded = true
    if (scope === "selected_webinars") {
      const incIds = (plan.metadata?.included_webinar_ids as string[]) || []
      isIncluded = Array.isArray(incIds) && incIds.includes(webinarId)
    } else {
      const excIds = (plan.metadata?.excluded_webinar_ids as string[]) || []
      isIncluded = !Array.isArray(excIds) || !excIds.includes(webinarId)
    }

    if (!isIncluded) {
      return res.status(400).json({
        message: `This webinar is excluded from your current subscription tier (${plan.name}). Please purchase an individual license or upgrade your plan.`,
        error: "WEBINAR_EXCLUDED_FROM_PLAN",
      })
    }

    // 5. Check if customer is ALREADY registered for this webinar
    const existingEntitlements = await webinarService.listCustomerEntitlements({
      customer_id: customerId,
      webinar: { id: webinarId },
      status: "active",
    })

    const validEnt = (existingEntitlements || []).find(
      (ent: any) => !ent.expires_at || new Date(ent.expires_at) > now
    )

    if (validEnt) {
      return res.json({
        success: true,
        already_registered: true,
        message: `You are already registered for "${webinar.title}". Access is active!`,
        entitlement: validEnt,
        monthly_access_used: validSub.monthly_access_used || 0,
      })
    }

    // 6. Check usage limits
    if (plan.webinar_access_limit !== null && plan.webinar_access_limit !== undefined && plan.webinar_access_limit > 0) {
      const currentUsed = validSub.monthly_access_used || 0
      if (currentUsed >= plan.webinar_access_limit) {
        return res.status(403).json({
          message: `Monthly webinar registration limit of ${plan.webinar_access_limit} reached for ${plan.name}. Your allowance renews on ${new Date(validSub.current_period_end).toLocaleDateString()}.`,
          error: "MONTHLY_LIMIT_EXCEEDED",
          limit: plan.webinar_access_limit,
          used: currentUsed,
        })
      }
    }

    // 7. Create Customer Entitlement record respecting the plan's actual access permissions
    const isFullBundle =
      Boolean(plan.includes_live) &&
      Boolean(plan.includes_recording) &&
      Boolean(plan.includes_transcript) &&
      Boolean(plan.includes_pdf)
    const derivedAccessType = isFullBundle
      ? "bundle"
      : plan.includes_live
      ? "live"
      : plan.includes_recording
      ? "recording"
      : plan.includes_transcript
      ? "transcript"
      : "pdf"

    const entitlement = await webinarService.createCustomerEntitlements({
      customer_id: customerId,
      customer_email: customerEmail || validSub.customer_email || "customer@academyio.com",
      webinar: webinar.id,
      order_id: `SUB_${validSub.id}`,
      variant_title: `Subscription Pass (${plan.name})`,
      access_type: derivedAccessType,
      status: "active",
      granted_at: now,
      expires_at: validSub.current_period_end,
      metadata: {
        source: "subscription",
        subscription_id: validSub.id,
        plan_id: plan.id,
        plan_name: plan.name,
        registered_at: now.toISOString(),
        includes: {
          live: Boolean(plan.includes_live),
          recording: Boolean(plan.includes_recording),
          transcript: Boolean(plan.includes_transcript),
          pdf: Boolean(plan.includes_pdf),
        },
      },
    })

    // 8. Increment monthly_access_used
    const newUsed = (validSub.monthly_access_used || 0) + 1
    await webinarService.updateCustomerSubscriptions({
      id: validSub.id,
      monthly_access_used: newUsed,
    })

    res.status(201).json({
      success: true,
      message: `Successfully registered for "${webinar.title}" with your ${plan.name}!`,
      entitlement,
      subscription: {
        id: validSub.id,
        monthly_access_used: newUsed,
        access_limit: plan.webinar_access_limit,
      },
    })
  } catch (error: any) {
    console.error("[Subscription Register Error]:", error)
    res.status(500).json({ message: "Failed to register for webinar with subscription", error: error.message })
  }
}
