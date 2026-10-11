import WebinarModule from "../modules/webinar"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  WebinarModule.linkable.webinar,
  ProductModule.linkable.product
)
