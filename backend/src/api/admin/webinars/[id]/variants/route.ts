import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"
import { ensureVariantPriceSet } from "../../../../../modules/webinar/utils/price-sync"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { id } = req.params

  const [webinar] = await webinarService.listWebinars({ id })
  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  const mappings = await webinarService.listWebinarVariantMappings({
    webinar_id: id,
  })

  let product: any = null
  let productVariants: any[] = []

  if (webinar.product_id) {
    try {
      product = await productModule.retrieveProduct(webinar.product_id, {
        relations: ["variants", "variants.options"],
      })
      productVariants = (product?.variants || []).filter((v: any) => !v.deleted_at)
    } catch (e) {
      // product might not exist yet
    }
  }

  const activeMappings = mappings.filter((m: any) => !m.deleted_at)

  // Merge variants with mappings
  const combinedVariants = activeMappings.map((mapping) => {
    const variant = productVariants.find((v) => v.id === mapping.variant_id)
    return {
      mapping_id: mapping.id,
      variant_id: mapping.variant_id,
      title: mapping.title || variant?.title || "Webinar Option",
      description: mapping.description || null,
      price: mapping.price !== null && mapping.price !== undefined ? mapping.price : 149,
      currency_code: mapping.currency_code || "usd",
      sku: variant?.sku || `SKU-${mapping.variant_id?.slice(-6)}`,
      option_type: mapping.option_type || "live",
      includes_live: mapping.includes_live || false,
      includes_recording: mapping.includes_recording || false,
      includes_transcript: mapping.includes_transcript || false,
      includes_pdf: mapping.includes_pdf || false,
      is_enabled: mapping.is_enabled !== undefined ? mapping.is_enabled : true,
      order_index: mapping.order_index || 0,
      expires_in_days: mapping.expires_in_days || null,
    }
  })

  // If webinar has NO configured mappings yet, show active product variants so admin can configure them
  if (activeMappings.length === 0) {
    for (const v of productVariants) {
      combinedVariants.push({
        mapping_id: null as any,
        variant_id: v.id,
        title: v.title,
        description: null,
        price: 149,
        currency_code: "usd",
        sku: v.sku,
        option_type: "live",
        includes_live: true,
        includes_recording: false,
        includes_transcript: false,
        includes_pdf: false,
        is_enabled: true,
        order_index: combinedVariants.length + 1,
        expires_in_days: null,
      })
    }
  }

  // Sort by order_index
  combinedVariants.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

  res.json({
    webinar_id: id,
    product_id: webinar.product_id,
    variants: combinedVariants,
    mappings: activeMappings,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const [webinar] = await webinarService.listWebinars({ id })
  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  let variantId = body.variant_id
  const title = body.title || "Custom Option"
  const sku = body.sku || `WEB-${webinar.id.slice(-6)}-OPT-${Date.now().toString().slice(-4)}`
  const price = body.price !== undefined ? parseInt(body.price) : 149

  // 1. If variant_id is not passed, create a new product variant on the linked Medusa product
  if (!variantId && webinar.product_id) {
    try {
      const createdVariant = await (productModule.createProductVariants as any)({
        product_id: webinar.product_id,
        title,
        sku,
        manage_inventory: false,
      })
      variantId = createdVariant.id || createdVariant[0]?.id
    } catch (err: any) {
      variantId = `var_custom_${Date.now()}`
    }
  } else if (!variantId) {
    variantId = `var_custom_${Date.now()}`
  }

  // 2. Update Medusa product variant if sku or title changed
  if (variantId && (body.sku || body.title) && webinar.product_id) {
    try {
      const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      await pgConnection.raw(
        `UPDATE product_variant SET title = COALESCE(?, title), sku = COALESCE(?, sku), updated_at = NOW() WHERE id = ?`,
        [body.title || null, body.sku || null, variantId]
      ).catch(() => {})

      const updateData: Record<string, any> = { id: variantId, manage_inventory: false }
      if (body.sku) updateData.sku = body.sku
      if (body.title) updateData.title = body.title
      await (productModule.updateProductVariants as any)(variantId, updateData).catch(() => {})
    } catch (e) {
      // ignore
    }
  }

  // 3. Find or create/update webinar_variant_mapping
  const [existingMapping] = await webinarService.listWebinarVariantMappings({
    variant_id: variantId,
  })

  let mapping
  if (existingMapping) {
    mapping = await webinarService.updateWebinarVariantMappings({
      id: existingMapping.id,
      title: body.title !== undefined ? body.title : existingMapping.title,
      description: body.description !== undefined ? body.description : existingMapping.description,
      price: body.price !== undefined ? parseInt(body.price) : existingMapping.price,
      currency_code: body.currency_code || existingMapping.currency_code || "usd",
      option_type: body.option_type !== undefined ? body.option_type : existingMapping.option_type,
      includes_live: body.includes_live !== undefined ? Boolean(body.includes_live) : existingMapping.includes_live,
      includes_recording: body.includes_recording !== undefined ? Boolean(body.includes_recording) : existingMapping.includes_recording,
      includes_transcript: body.includes_transcript !== undefined ? Boolean(body.includes_transcript) : existingMapping.includes_transcript,
      includes_pdf: body.includes_pdf !== undefined ? Boolean(body.includes_pdf) : existingMapping.includes_pdf,
      is_enabled: body.is_enabled !== undefined ? Boolean(body.is_enabled) : existingMapping.is_enabled,
      order_index: body.order_index !== undefined ? parseInt(body.order_index) : existingMapping.order_index,
      expires_in_days: body.expires_in_days !== undefined ? (body.expires_in_days ? parseInt(body.expires_in_days) : null) : existingMapping.expires_in_days,
    })
  } else {
    mapping = await webinarService.createWebinarVariantMappings({
      webinar_id: id,
      variant_id: variantId,
      title,
      description: body.description || null,
      price,
      currency_code: body.currency_code || "usd",
      option_type: body.option_type || "live",
      includes_live: Boolean(body.includes_live),
      includes_recording: Boolean(body.includes_recording),
      includes_transcript: Boolean(body.includes_transcript),
      includes_pdf: Boolean(body.includes_pdf),
      is_enabled: body.is_enabled !== undefined ? Boolean(body.is_enabled) : true,
      order_index: body.order_index !== undefined ? parseInt(body.order_index) : 1,
      expires_in_days: body.expires_in_days ? parseInt(body.expires_in_days) : null,
    })
  }

  // Ensure Medusa Pricing module Price Set exists and is linked
  const finalPrice = body.price !== undefined ? parseInt(body.price) : price
  await ensureVariantPriceSet(req.scope, variantId, finalPrice, body.currency_code || "usd")

  res.json({
    message: "Purchase option saved successfully",
    variant_id: variantId,
    mapping,
  })
}
