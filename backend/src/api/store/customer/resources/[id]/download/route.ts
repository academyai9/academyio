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
  const requiredType = resource.access_type === "transcript" ? "transcript" : "pdf"

  // 2. Verify customer entitlement
  const hasAccess = await webinarService.checkCustomerAccess(customerId, webinarId, requiredType as any)

  if (!hasAccess) {
    return res.status(403).json({
      message: `Access denied. You do not own a valid ${requiredType.toUpperCase()} entitlement for this webinar.`,
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
