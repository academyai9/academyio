import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"
import { ensureVariantPriceSet } from "../../../../../modules/webinar/utils/price-sync"
import crypto from "crypto"

function generateVariantId() {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(6).toString("hex")
  return `variant_01${timestamp}${random}`.slice(0, 32)
}

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

  // Filter out any deleted or standalone PDF options
  const activeMappings = mappings.filter(
    (m: any) => !m.deleted_at && m.option_type !== "pdf" && !m.title?.toLowerCase().includes("pdf study guide")
  )

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
      if (v.sku?.endsWith("-PDF") || v.title?.toLowerCase().includes("pdf study guide")) continue
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
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const [webinar] = await webinarService.listWebinars({ id })
  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  let variantId = body.variant_id
  const title = body.title || "Custom Option"
  const sku = body.sku || `WEB-${webinar.id.slice(-6)}-OPT-${Date.now().toString().slice(-4)}`
  const price = body.price !== undefined ? Math.max(1, parseInt(body.price, 10)) : 149

  // 1. If variant_id is not provided or starts with a placeholder, ensure a real Medusa product variant is created
  if ((!variantId || variantId.startsWith("var_custom_") || variantId.startsWith("default_")) && webinar.product_id) {
    const newVariantId = generateVariantId()
    try {
      await pgConnection.raw(
        `INSERT INTO product_variant (id, title, sku, product_id, manage_inventory, allow_backorder, created_at, updated_at)
         VALUES (?, ?, ?, ?, false, false, NOW(), NOW())`,
        [newVariantId, title, sku, webinar.product_id]
      )
      variantId = newVariantId
    } catch (err: any) {
      try {
        const createdVariant = await (productModule.createProductVariants as any)({
          product_id: webinar.product_id,
          title,
          sku,
          manage_inventory: false,
        })
        variantId = createdVariant.id || createdVariant[0]?.id || newVariantId
      } catch (innerErr: any) {
        variantId = newVariantId
      }
    }
  } else if (!variantId) {
    variantId = generateVariantId()
  }

  // 2. Update Medusa product variant title and SKU
  if (variantId && (body.sku || body.title) && webinar.product_id) {
    try {
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

  // 3. Find existing mapping by mapping_id or variant_id
  let existingMapping: any = null
  if (body.mapping_id) {
    const [m] = await webinarService.listWebinarVariantMappings({ id: body.mapping_id }).catch(() => [])
    existingMapping = m
  }
  if (!existingMapping && variantId) {
    const [m] = await webinarService.listWebinarVariantMappings({ variant_id: variantId }).catch(() => [])
    existingMapping = m
  }

  let mapping
  if (existingMapping) {
    mapping = await webinarService.updateWebinarVariantMappings({
      id: existingMapping.id,
      title: body.title !== undefined ? body.title : existingMapping.title,
      description: body.description !== undefined ? body.description : existingMapping.description,
      price: price,
      currency_code: body.currency_code || existingMapping.currency_code || "usd",
      option_type: body.option_type !== undefined ? body.option_type : existingMapping.option_type,
      includes_live: body.includes_live !== undefined ? Boolean(body.includes_live) : existingMapping.includes_live,
      includes_recording: body.includes_recording !== undefined ? Boolean(body.includes_recording) : existingMapping.includes_recording,
      includes_transcript: body.includes_transcript !== undefined ? Boolean(body.includes_transcript) : existingMapping.includes_transcript,
      includes_pdf: body.includes_pdf !== undefined ? Boolean(body.includes_pdf) : existingMapping.includes_pdf,
      is_enabled: body.is_enabled !== undefined ? Boolean(body.is_enabled) : existingMapping.is_enabled,
      order_index: body.order_index !== undefined ? parseInt(body.order_index, 10) : existingMapping.order_index,
      expires_in_days: body.expires_in_days !== undefined ? (body.expires_in_days ? parseInt(body.expires_in_days, 10) : null) : existingMapping.expires_in_days,
    })

    // Direct SQL safeguard to ensure PostgreSQL reflects new price immediately
    await pgConnection.raw(
      `UPDATE webinar_variant_mapping 
       SET price = ?, title = ?, description = ?, is_enabled = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        price,
        body.title !== undefined ? body.title : existingMapping.title,
        body.description !== undefined ? body.description : existingMapping.description,
        body.is_enabled !== undefined ? Boolean(body.is_enabled) : existingMapping.is_enabled,
        existingMapping.id,
      ]
    ).catch(() => {})
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
      order_index: body.order_index !== undefined ? parseInt(body.order_index, 10) : 1,
      expires_in_days: body.expires_in_days ? parseInt(body.expires_in_days, 10) : null,
    })
  }

  // 4. Ensure Medusa Pricing module Price Set exists and is linked with the custom price
  await ensureVariantPriceSet(req.scope, variantId, price, body.currency_code || "usd")

  res.json({
    message: "Purchase option saved successfully",
    variant_id: variantId,
    mapping,
  })
}
