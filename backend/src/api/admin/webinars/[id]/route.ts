import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [webinar] = await webinarService.listWebinars(
    { id },
    { relations: ["resources", "entitlements"] }
  )

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  res.json({ webinar })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const updated = await webinarService.updateWebinars({
    id,
    ...body,
  })

  res.json({ webinar: updated })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  await webinarService.deleteWebinars([id])

  res.json({ id, object: "webinar", deleted: true })
}
