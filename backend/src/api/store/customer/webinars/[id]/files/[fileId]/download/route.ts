import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { S3StorageService } from "../../../../../../../../modules/webinar/s3-storage-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id: webinarId, fileId } = req.params
    const customerId = (req as any).auth_context?.actor_id

    if (!customerId) {
      return res.status(401).json({ message: "Authentication required to download webinar materials." })
    }

    // 1. Fetch File Record
    const fileRes = await pgConnection.raw(
      `
      SELECT * FROM webinar_file
      WHERE id = ? AND webinar_id = ? AND is_active = true AND deleted_at IS NULL
    `,
      [fileId, webinarId]
    )

    if (!fileRes.rows || fileRes.rows.length === 0) {
      return res.status(404).json({ message: "Requested material was not found or is currently inactive." })
    }

    const file = fileRes.rows[0]

    // 2. Authorize Customer Ownership & Entitlements
    const entRes = await pgConnection.raw(
      `
      SELECT id, access_type, status, expires_at
      FROM customer_entitlement
      WHERE customer_id = ? AND webinar_id = ? AND status = 'active' AND deleted_at IS NULL
    `,
      [customerId, webinarId]
    )

    const subRes = await pgConnection.raw(
      `
      SELECT id, status FROM customer_subscription
      WHERE customer_id = ? AND status = 'active' AND deleted_at IS NULL
        AND (current_period_end IS NULL OR current_period_end > NOW())
    `,
      [customerId]
    )

    const orderRes = await pgConnection.raw(
      `
      SELECT o.id, o.status, oli.variant_id, wvm.option_type
      FROM "order" o
      JOIN order_line_item oli ON oli.order_id = o.id
      JOIN webinar w ON w.id = ?
      LEFT JOIN webinar_variant_mapping wvm ON wvm.variant_id = oli.variant_id
      WHERE o.customer_id = ?
        AND oli.product_id = w.product_id
        AND o.deleted_at IS NULL
        AND o.status NOT IN ('canceled', 'archived')
    `,
      [webinarId, customerId]
    )

    const hasActiveSubscription = subRes.rows && subRes.rows.length > 0
    const entitlements = entRes.rows || []
    const orders = orderRes.rows || []

    const isAuthorized = hasActiveSubscription || entitlements.length > 0 || orders.length > 0

    if (!isAuthorized) {
      return res.status(403).json({
        message: "Access Denied: You do not have an active purchase or entitlement for this webinar.",
      })
    }

    // Check specific option access
    const accessTypes = new Set<string>()
    if (hasActiveSubscription) {
      accessTypes.add("bundle")
      accessTypes.add("all")
    }

    for (const ent of entitlements) {
      if (!ent.expires_at || new Date(ent.expires_at) > new Date()) {
        accessTypes.add(ent.access_type)
      }
    }

    for (const ord of orders) {
      accessTypes.add(ord.option_type || "bundle")
    }

    const hasFullAccess = accessTypes.has("bundle") || accessTypes.has("all")
    let canDownloadThisFile = false

    if (hasFullAccess || file.purchase_option === "all") {
      canDownloadThisFile = true
    } else if (accessTypes.has(file.purchase_option)) {
      canDownloadThisFile = true
    } else if (
      (accessTypes.has("recording") || accessTypes.has("transcript") || accessTypes.has("pdf") || accessTypes.has("live")) &&
      (file.material_type === "slides" || file.material_type === "handout" || file.material_type === "worksheet")
    ) {
      canDownloadThisFile = true
    }

    if (!canDownloadThisFile) {
      return res.status(403).json({
        message: `Your purchased package does not include ${file.material_type || "this asset"} downloads. Please upgrade to the full package or recording option.`,
      })
    }

    // 3. Generate Short-Lived Presigned Download URL (15 minutes / 900 seconds)
    const presigned = await S3StorageService.getPresignedDownloadUrl({
      s3Key: file.s3_key,
      fileName: file.file_name,
      mimeType: file.mime_type,
      expiresInSeconds: 900,
      asAttachment: true,
    })

    // Log the download event (without credentials)
    console.log(`[S3 Audit] Customer ${customerId} generated presigned download for file ${file.id} (${file.file_name})`)

    res.json({
      message: "Presigned download URL generated successfully",
      download_url: presigned.download_url,
      file_name: presigned.file_name,
      expires_in_seconds: presigned.expires_in_seconds,
    })
  } catch (error: any) {
    console.error("Error generating customer download URL:", error)
    res.status(500).json({ message: "Failed to generate download URL", error: error.message })
  }
}
