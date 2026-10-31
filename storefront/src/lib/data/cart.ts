"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { listCartShippingMethods } from "./fulfillment"
import { getLocale } from "@lib/data/locale-actions"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, *shipping_methods, *shipping_address, *billing_address, *payment_collection.payment_sessions"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "no-store",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

/**
 * High-speed direct webinar enrollment action.
 * Optimized for low-latency & clean single-purchase guarantee:
 * - If no cart exists yet (new visitor), creates cart WITH items in a single API roundtrip.
 * - If cart already contains ONLY this item, skips redundant write API call.
 * - If cart has stale line items from previous abandoned sessions or different options,
 *   clears them and ensures ONLY the newly selected webinar option is in the cart.
 */
export async function fastDirectEnroll({
  variantId,
  countryCode,
}: {
  variantId: string
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when enrolling in webinar")
  }

  const region = await getRegion(countryCode)
  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  const existingCartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }

  // Helper to create a fresh dedicated cart with this single webinar item
  const createFreshCart = async () => {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      {
        region_id: region.id,
        locale: locale || undefined,
        items: [{ variant_id: variantId, quantity: 1 }],
      },
      {},
      headers
    )
    const newCart = cartResp.cart
    await setCartId(newCart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    return { success: true, cartId: newCart.id }
  }

  // Case 1: Brand new visitor (no cart cookie exists yet)
  if (!existingCartId) {
    return await createFreshCart()
  }

  // Case 2: Existing cart cookie - verify and ensure clean dedicated enrollment
  try {
    const cart = await retrieveCart(existingCartId, "id,region_id,*items")
    if (!cart) {
      return await createFreshCart()
    }

    // Fast-path: Cart already has ONLY this exact item
    const isExactMatch =
      cart.items &&
      cart.items.length === 1 &&
      cart.items[0].variant_id === variantId &&
      cart.items[0].quantity === 1

    if (isExactMatch) {
      return { success: true, cartId: cart.id }
    }

    // Remove any stale or different items from previous sessions/options
    const itemsToRemove = (cart.items || []).filter((i) => i.variant_id !== variantId)
    if (itemsToRemove.length > 0) {
      await Promise.all(
        itemsToRemove.map((item) =>
          sdk.store.cart.deleteLineItem(cart.id, item.id, {}, headers).catch(() => {})
        )
      )
    }

    // If variant is not in the cart yet, add it
    const hasVariant = cart.items?.some((i) => i.variant_id === variantId)
    if (!hasVariant) {
      await sdk.store.cart.createLineItem(
        cart.id,
        { variant_id: variantId, quantity: 1 },
        {},
        headers
      )
    }

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    return { success: true, cartId: cart.id }
  } catch (err: any) {
    console.warn("Direct enrollment notice, creating fresh cart:", err?.message || err)
    try {
      return await createFreshCart()
    } catch (fallbackErr: any) {
      console.error("Direct enroll fatal error:", fallbackErr?.message || fallbackErr)
      throw fallbackErr
    }
  }
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)

  return await retrieveCart(cartId)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)

  return await retrieveCart(cartId)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  let redirectCountryCode = "us"
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const selectedCountryCode = String(
      formData.get("shipping_address.country_code") || "us"
    ).toLowerCase()
    redirectCountryCode = selectedCountryCode

    const region = await getRegion(selectedCountryCode)
    const cart = await retrieveCart(cartId)
    if (region && cart && cart.region_id !== region.id) {
      await updateCart({ region_id: region.id })
    }

    const data: Record<string, any> = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company") || "",
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: selectedCountryCode,
        province: formData.get("shipping_address.province") || "",
        phone: formData.get("shipping_address.phone") || "",
      },
      email: formData.get("email"),
    }

    const sameAsBilling = formData.get("same_as_billing")
    const billingAddress1 = formData.get("billing_address.address_1")
    if (sameAsBilling === "on" || sameAsBilling === "true" || !billingAddress1) {
      data.billing_address = { ...data.shipping_address }
    } else {
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: billingAddress1,
        address_2: "",
        company: formData.get("billing_address.company") || "",
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: String(
          formData.get("billing_address.country_code") || selectedCountryCode
        ).toLowerCase(),
        province: formData.get("billing_address.province") || "",
        phone: formData.get("billing_address.phone") || "",
      }
    }

    await updateCart(data)

    // Check shipping methods: if no shipping method set yet, auto-assign digital shipping method
    const updatedCart = await retrieveCart(cartId)
    if (
      updatedCart &&
      (!updatedCart.shipping_methods || updatedCart.shipping_methods.length === 0)
    ) {
      const shippingOptions = await listCartShippingMethods(cartId)
      if (shippingOptions && shippingOptions.length > 0) {
        const digitalOption =
          shippingOptions.find(
            (o) =>
              o.name?.toLowerCase().includes("digital") ||
              o.name?.toLowerCase().includes("instant") ||
              o.amount === 0
          ) || shippingOptions[0]
        if (digitalOption) {
          await setShippingMethod({ cartId, shippingMethodId: digitalOption.id })
        }
      }
    }
  } catch (e: any) {
    return e.message
  }

  redirect(`/${redirectCountryCode}/checkout?step=delivery`)
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase() || "us"

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    await removeCartId()
    redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  throw new Error(
    cartRes?.error?.message ||
      (cartRes as any)?.message ||
      "Order could not be completed. Please verify your payment details and try again."
  )
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
