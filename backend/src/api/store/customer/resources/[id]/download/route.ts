import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const customerId = (req as any).auth_context?.actor_id
  const { id: resourceId } = req.params

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to download resources" })
  }

  // 1. Fetch resource record
  const [resource] = await webinarService.listWebinarResources(
    { id: resourceId },
    { relations: ["webinar"] }
  )

  if (!resource || !resource.webinar) {
    return res.status(404).json({ message: "Resource not found" })
  }

  const webinarId = resource.webinar.id
  let hasAccess = false

  if (resource.access_type === "transcript") {
    hasAccess = await webinarService.checkCustomerAccess(customerId, webinarId, "transcript")
  } else {
    // Conference Materials & Downloads are included for any customer who purchased this webinar
    const activeEntitlements = await webinarService.listCustomerEntitlements({
      customer_id: customerId,
      webinar: { id: webinarId },
      status: "active",
    })
    const now = new Date()
    hasAccess = (activeEntitlements || []).some(
      (e: any) => !e.expires_at || new Date(e.expires_at) > now
    )
    if (!hasAccess) {
      hasAccess = await webinarService.checkCustomerAccess(customerId, webinarId, "pdf")
    }
  }

  if (!hasAccess) {
    return res.status(403).json({
      message: "Access denied. You do not own a valid enrollment for this webinar's materials.",
    })
  }

  // 3. Return secure file location or redirect to private storage URL
  if (resource.file_url.startsWith("http://") || resource.file_url.startsWith("https://")) {
    return res.redirect(resource.file_url)
  }

  // If local file path, serve attachment with proper content headers
  res.setHeader("Content-Disposition", `attachment; filename="${resource.file_name || 'resource.pdf'}"`)
  res.setHeader("Content-Type", "application/pdf")
  res.json({
    download_url: resource.file_url,
    file_name: resource.file_name,
    authorized: true,
  })
}
