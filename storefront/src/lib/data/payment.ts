"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export interface ActivePaymentMethodConfig {
  id: string
  provider_id: string
  medusa_provider_id: string
  display_title: string
  description?: string
  environment: string
  publishable_key?: string
  underlying_gateway?: string
  verification_mode?: string
  supported_cards?: string[]
  updated_at?: string
}

export const listActivePaymentMethodConfigs = async (): Promise<ActivePaymentMethodConfig[]> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ payment_methods: ActivePaymentMethodConfig[]; count: number }>(
      `/store/payment-methods-config`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    )
    .then((res) => res.payment_methods || [])
    .catch((err) => {
      console.warn("[Payment Data] Failed to fetch payment methods config:", err?.message || err)
      return []
    })
}

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  // 1. Fetch available payment providers in the region
  const regionProviders = await sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "no-store",
      }
    )
    .then(({ payment_providers }) => payment_providers || [])
    .catch(() => [] as any[])

  // 2. Fetch admin dynamic active payment method configurations
  const activeConfigs = await listActivePaymentMethodConfigs()

  // If no methods are active in admin, return empty list (triggers customer notice)
  if (!activeConfigs || activeConfigs.length === 0) {
    return []
  }

  // 3. Filter and enrich providers based on active payment methods
  const enrichedMethods: any[] = []

  for (const config of activeConfigs) {
    const matched = regionProviders.find(
      (p) =>
        p.id === config.medusa_provider_id ||
        (config.provider_id === "stripe" && p.id?.startsWith("pp_stripe_")) ||
        (config.provider_id === "paypal" && p.id?.startsWith("pp_paypal")) ||
        (config.provider_id === "electronic_card" && p.id === "pp_system_default")
    )

    if (matched) {
      enrichedMethods.push({
        ...matched,
        id: matched.id,
        display_title: config.display_title,
        description: config.description,
        environment: config.environment,
        publishable_key: config.publishable_key,
        underlying_gateway: config.underlying_gateway,
        supported_cards: config.supported_cards,
      })
    } else {
      // Direct method mapping
      enrichedMethods.push({
        id: config.medusa_provider_id,
        is_enabled: true,
        display_title: config.display_title,
        description: config.description,
        environment: config.environment,
        publishable_key: config.publishable_key,
        underlying_gateway: config.underlying_gateway,
        supported_cards: config.supported_cards,
      })
    }
  }

  return enrichedMethods.sort((a, b) => (a.id > b.id ? 1 : -1))
}
