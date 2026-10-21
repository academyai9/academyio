import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function seedDigitalFulfillment({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const regionService = container.resolve(Modules.REGION)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION)

  logger.info("Setting up Digital Fulfillment and Shipping Options for North America and Europe...")

  const regions = await regionService.listRegions()
  const naRegion = regions.find((r) => r.currency_code === "usd")
  const euRegion = regions.find((r) => r.currency_code === "eur")

  const [stockLocation] = await stockLocationModuleService.listStockLocations({})
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  const shippingProfile = shippingProfiles[0]

  // Check if fulfillment set exists
  const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets(
    {},
    { relations: ["service_zones", "service_zones.geo_zones"] }
  )

  let fSet = fulfillmentSets[0]
  if (!fSet) {
    fSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Digital Webinar Delivery",
      type: "shipping",
    })
  }

  // Check if North America service zone exists
  let naZone = fSet.service_zones?.find((sz: any) => sz.name === "North America Digital")
  if (!naZone) {
    naZone = await fulfillmentModuleService.createServiceZones({
      fulfillment_set_id: fSet.id,
      name: "North America Digital",
      geo_zones: [
        { country_code: "us", type: "country" },
        { country_code: "ca", type: "country" },
      ],
    })
  }

  // Ensure stock location is linked to fulfillment set
  try {
    await link.create([
      {
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: fSet.id,
        },
      },
    ])
  } catch (e) {
    // link might already exist
  }

  // Check existing shipping options
  const existingOptions = await fulfillmentModuleService.listShippingOptions()
  const hasDigitalNa = existingOptions.some((o: any) => o.name === "Instant Digital Access (North America)")

  if (!hasDigitalNa && naZone) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Instant Digital Access (North America)",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: naZone.id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Digital Access",
            description: "Instant access to live session, recordings, and handouts.",
            code: "digital_download",
          },
          prices: [
            {
              currency_code: "usd",
              amount: 0,
            },
            ...(naRegion ? [{ region_id: naRegion.id, amount: 0 }] : []),
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    })
    logger.info("Created Instant Digital Access (North America) with $0 price!")
  }

  logger.info("Digital fulfillment seeding completed successfully.")
}
