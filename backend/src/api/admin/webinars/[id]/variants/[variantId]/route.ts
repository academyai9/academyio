import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"
import { deleteProductVariantsWorkflow } from "@medusajs/core-flows"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id, variantId } = req.params

    const [webinar] = await webinarService.listWebinars({ id })
    if (!webinar) {
      return res.status(404).json({ message: "Webinar not found" })
    }

    // 1. Find mapping by variant_id or by id
    const mappings = await webinarService.listWebinarVariantMappings({
      webinar_id: id,
    })

    const targetMapping = mappings.find(
      (m) => m.variant_id === variantId || m.id === variantId
    )

    const actualVariantId = targetMapping?.variant_id || variantId
    const mappingId = targetMapping?.id || (variantId.startsWith("wvm_") ? variantId : null)

    // 2. Delete mapping
    if (mappingId) {
      try {
        await webinarService.deleteWebinarVariantMappings(mappingId)
      } catch (err: any) {
        console.warn("[Webinar Variants] deleteWebinarVariantMappings error:", err.message)
      }
    }

    // Direct database safeguard for mapping removal
    await pgConnection.raw(`
      DELETE FROM webinar_variant_mapping 
      WHERE webinar_id = ? AND (variant_id = ? OR id = ?)
    `, [id, actualVariantId, variantId]).catch(() => {})

    // 3. Clean up linked Medusa product variant
    const isMedusaVariant =
      actualVariantId &&
      (actualVariantId.startsWith("variant_") || actualVariantId.startsWith("var_")) &&
      !actualVariantId.startsWith("var_custom_")

    if (webinar.product_id && isMedusaVariant) {
      // Check if variant has historical orders
      let orderCount = 0
      try {
        const orderRes = await pgConnection.raw(`
          SELECT count(*) as count FROM order_line_item WHERE variant_id = ?
        `, [actualVariantId])
        orderCount = parseInt(orderRes.rows?.[0]?.count || "0", 10)
      } catch (e) {}

      // Clean up relations and links
      await pgConnection.raw(`DELETE FROM product_variant_price_set WHERE variant_id = ?`, [actualVariantId]).catch(() => {})
      await pgConnection.raw(`DELETE FROM product_variant_option WHERE variant_id = ?`, [actualVariantId]).catch(() => {})
      await pgConnection.raw(`DELETE FROM cart_line_item WHERE variant_id = ?`, [actualVariantId]).catch(() => {})
      await pgConnection.raw(`DELETE FROM product_variant_inventory_item WHERE variant_id = ?`, [actualVariantId]).catch(() => {})
      await pgConnection.raw(`DELETE FROM customer_entitlement WHERE variant_id = ?`, [actualVariantId]).catch(() => {})
      await pgConnection.raw(`UPDATE webinar_file SET variant_id = NULL WHERE variant_id = ?`, [actualVariantId]).catch(() => {})

      // Soft delete in product_variant so Medusa standard queries filter it out
      await pgConnection.raw(`
        UPDATE product_variant SET deleted_at = NOW() WHERE id = ?
      `, [actualVariantId]).catch(() => {})

      // If zero orders, permanently remove the variant row
      if (orderCount === 0) {
        await pgConnection.raw(`
          DELETE FROM product_variant WHERE id = ?
        `, [actualVariantId]).catch(() => {})
      }

      // Also trigger Medusa core workflow if possible
      try {
        await deleteProductVariantsWorkflow(req.scope).run({
          input: { ids: [actualVariantId] },
        })
      } catch (wfErr: any) {
        // Workflow may fail if already deleted or soft-deleted, which is completely fine
      }
    }

    return res.json({
      message: "Purchase option deleted successfully",
      deleted_id: variantId,
      variant_id: actualVariantId,
    })
  } catch (error: any) {
    console.error("[Webinar Variants] Failed to delete variant option:", error)
    return res.status(500).json({
      message: error.message || "Failed to delete purchase option",
    })
  }
}

