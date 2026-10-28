import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
  res.json({
    status: "ok",
    service: "academyio-backend",
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
