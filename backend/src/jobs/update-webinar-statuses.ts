import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"
import { getWebinarEndTimestamp } from "../modules/webinar/utils/webinar-status"

/**
 * Scheduled background job that automatically manages webinar lifecycle states:
 * - When scheduled end time passes, marks webinar as completed (is_upcoming = false).
 * - If an administrator has attached and published a recording, transitions it to on-demand (is_ondemand = true).
 * - If no published recording exists, keeps it out of on-demand so no broken links are displayed.
 */
export default async function updateWebinarStatuses(container: MedusaContainer): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)

  const now = new Date()

  try {
    const [webinars] = await webinarService.listAndCountWebinars({
      status: "published",
    })

    let transitionedCount = 0

    for (const webinar of webinars) {
      const endTimestamp = getWebinarEndTimestamp(webinar)
      const isPast = now.getTime() >= endTimestamp.getTime()

      if (isPast) {
        let shouldUpdate = false
        const updatePayload: Record<string, any> = { id: webinar.id }

        // Transition out of upcoming
        if (webinar.is_upcoming) {
          updatePayload.is_upcoming = false
          shouldUpdate = true
        }

        // Manage on-demand state strictly based on published recording availability
        const hasPublishedRecording = Boolean(webinar.recording_url) && Boolean(webinar.recording_published)
        if (hasPublishedRecording && !webinar.is_ondemand) {
          updatePayload.is_ondemand = true
          shouldUpdate = true
        } else if (!hasPublishedRecording && webinar.is_ondemand) {
          updatePayload.is_ondemand = false
          shouldUpdate = true
        }

        if (shouldUpdate) {
          await webinarService.updateWebinars(updatePayload)
          transitionedCount++
          logger.info(
            `[WebinarStatusJob] Auto-transitioned webinar "${webinar.title}" (ID: ${webinar.id}) -> ` +
            `upcoming=${updatePayload.is_upcoming ?? webinar.is_upcoming}, ondemand=${updatePayload.is_ondemand ?? webinar.is_ondemand}`
          )
        }
      }
    }

    if (transitionedCount > 0) {
      logger.info(`[WebinarStatusJob] Synchronized ${transitionedCount} webinar lifecycle records.`)
    }
  } catch (err: any) {
    logger.error(`[WebinarStatusJob] Error updating webinar statuses: ${err.message}`)
  }
}

export const config = {
  name: "update-webinar-statuses",
  schedule: "* * * * *", // Runs every minute
}
