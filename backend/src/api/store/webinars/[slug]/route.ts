import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { slug } = req.params

  // Query webinar by slug or id
  const [bySlug] = await webinarService.listWebinars(
    { slug, status: "published" },
    { relations: ["resources"] }
  )

  let webinar = bySlug
  if (!webinar) {
    const [byId] = await webinarService.listWebinars(
      { id: slug, status: "published" },
      { relations: ["resources"] }
    )
    webinar = byId
  }

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  // Fetch linked product and its variants if product_id exists
  let variants: any[] = []
  if (webinar.product_id) {
    try {
      const [product] = await productModule.listProducts(
        { id: webinar.product_id },
        { relations: ["variants", "options"] }
      )

      if (product && product.variants) {
        // Query mappings
        const mappings = await webinarService.listWebinarVariantMappings({
          webinar_id: webinar.id,
        })
        const mappingMap = new Map(mappings.map((m: any) => [m.variant_id, m]))

        variants = product.variants.map((v: any) => {
          const mapping = mappingMap.get(v.id) as any
          return {
            id: v.id,
            title: v.title,
            sku: v.sku,
            option_type: mapping ? mapping.option_type : "live",
            includes: {
              live: mapping ? mapping.includes_live : true,
              recording: mapping ? mapping.includes_recording : false,
              transcript: mapping ? mapping.includes_transcript : false,
              pdf: mapping ? mapping.includes_pdf : false,
            },
            metadata: v.metadata,
          }
        })
      }
    } catch (err) {
      // Product module query fallback
    }
  }

  // Sanitize: do not expose private links on the public product page
  const {
    live_stream_url,
    live_instructions,
    recording_url,
    transcript_content,
    ...publicWebinar
  } = webinar as any

  res.json({
    webinar: {
      ...publicWebinar,
      variants,
      available_options: [
        { type: "live", label: "Live Webinar Access", available: true },
        { type: "recording", label: "Recorded Webinar", available: Boolean(webinar.recording_url || webinar.is_upcoming) },
        { type: "transcript", label: "Webinar Transcript", available: Boolean(webinar.transcript_file_url || webinar.transcript_content) },
        { type: "pdf", label: "PDF Download / Study Guide", available: true },
        { type: "bundle", label: "Complete Package (All Included)", available: true },
      ],
    },
  })
}
