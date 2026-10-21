import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { id, variantId } = req.params

  const [webinar] = await webinarService.listWebinars({ id })
  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  // Find mapping by variant_id or by id
  const mappings = await webinarService.listWebinarVariantMappings({
    webinar_id: id,
  })

  const targetMapping = mappings.find(
    (m) => m.variant_id === variantId || m.id === variantId
  )

  if (targetMapping) {
    await webinarService.deleteWebinarVariantMappings(targetMapping.id)
  }

  // Optionally delete product variant if linked
  if (webinar.product_id && variantId.startsWith("var_") && !variantId.startsWith("var_custom_")) {
    try {
      await (productModule.deleteProductVariants as any)(variantId)
    } catch (e) {
      // product variant might have orders or FK, so ignore if failed
    }
  }

  res.json({
    message: "Purchase option deleted successfully",
    deleted_id: variantId,
  })
}
