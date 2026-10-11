import { Module } from "@medusajs/framework/utils"
import WebinarModuleService from "./service"

export const WEBINAR_MODULE = "webinarModuleService"

export default Module(WEBINAR_MODULE, {
  service: WebinarModuleService,
})
