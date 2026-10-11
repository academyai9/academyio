import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function seedUsRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info("Adding United States region...")
  try {
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "North America",
            currency_code: "usd",
            countries: ["us", "ca"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    logger.info("Successfully added United States region!")
  } catch (err: any) {
    logger.warn(`Region might already exist: ${err.message}`)
  }
}
