import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

export default async function seedSpeakers({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)

  logger.info("==================================================")
  logger.info("Checking and seeding Speakers table...")
  logger.info("==================================================")

  const existingSpeakers = await (webinarService as any).listSpeakers({})
  logger.info(`Existing speakers in database: ${existingSpeakers.length}`)

  const facultySpeakers = [
    {
      name: "Barbara Weltman, Esq.",
      slug: "barbara-weltman",
      designation: "Tax Attorney & Author",
      qualifications: "Esq., JD",
      company: "Big Ideas for Small Business, Inc.",
      email: "bweltman@academyio.com",
      phone: "+1 (555) 234-5671",
      bio: "Barbara Weltman is an attorney specializing in taxation and author of J.K. Lasser's Small Business Taxes. Named one of the 100 Most Influential People in Accounting by Accounting Today.",
      photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
      status: "active",
    },
    {
      name: "Greg White, CPA",
      slug: "greg-white",
      designation: "Managing Partner & Contributing Editor",
      qualifications: "CPA",
      company: "Tax Practice Advisor LLC",
      email: "gwhite@academyio.com",
      phone: "+1 (555) 234-5672",
      bio: "Greg White has practiced tax for over 35 years and taught extensively for the AICPA, state CPA societies, and leading continuing education providers nationwide.",
      photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      status: "active",
    },
    {
      name: "Jennifer Louis, CPA",
      slug: "jennifer-louis",
      designation: "President of Emeritus Consulting Services",
      qualifications: "CPA",
      company: "Emeritus Consulting Services",
      email: "jlouis@academyio.com",
      phone: "+1 (555) 234-5673",
      bio: "Jennifer Louis has over 25 years of experience in auditing and accounting education, previously serving as an audit manager at Deloitte & Touche LLP.",
      photo_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
      status: "active",
    },
    {
      name: "David Peters, CPA, MST, CFP",
      slug: "david-peters",
      designation: "Founder & Senior Wealth Strategist",
      qualifications: "CPA, MST, CFP",
      company: "Peters Tax & Wealth Consulting",
      email: "dpeters@academyio.com",
      phone: "+1 (555) 234-5674",
      bio: "David Peters has over two decades of financial and tax consulting experience, providing strategic advisory services to middle-market corporations and high-net-worth clients.",
      photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
      status: "active",
    },
    {
      name: "Robert S. Keebler, CPA/PFS, MST, AEP",
      slug: "robert-keebler",
      designation: "Partner at Keebler & Associates, Hall of Fame Tax Educator",
      qualifications: "CPA, PFS, MST, AEP",
      company: "Keebler & Associates, LLP",
      email: "rkeebler@academyio.com",
      phone: "+1 (555) 234-5675",
      bio: "Bob Keebler is one of the nation's leading experts in estate, gift, and retirement distribution planning. Inducted into the National Estate Planning Hall of Fame.",
      photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80",
      status: "active",
    },
    {
      name: "Dr. Amanda Chen, Ph.D., CPA, CFE",
      slug: "amanda-chen",
      designation: "Professor of Accounting Information Systems & Forensic Auditing",
      qualifications: "Ph.D., CPA, CFE",
      company: "Center for Financial Integrity",
      email: "achen@academyio.com",
      phone: "+1 (555) 234-5676",
      bio: "Dr. Chen is an authority on algorithmic audit procedures, fraud analytics, and automated testing, advising national accounting standards bodies and global corporations.",
      photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      status: "active",
    },
  ]

  const createdSpeakersMap = new Map<string, any>()

  for (const faculty of facultySpeakers) {
    const existing = existingSpeakers.find(
      (s: any) =>
        s.slug === faculty.slug ||
        s.name.toLowerCase() === faculty.name.toLowerCase()
    )

    if (existing) {
      logger.info(`Speaker already exists: ${existing.name} (${existing.id}) - updating details...`)
      const updated = await (webinarService as any).updateSpeakers({
        id: existing.id,
        ...faculty,
      })
      createdSpeakersMap.set(faculty.name.toLowerCase(), updated || existing)
    } else {
      logger.info(`Creating speaker: ${faculty.name}...`)
      const created = await (webinarService as any).createSpeakers(faculty)
      logger.info(`Created speaker: ${faculty.name} with id: ${created.id}`)
      createdSpeakersMap.set(faculty.name.toLowerCase(), created)
    }
  }

  // Now, link webinars to their corresponding speaker_id
  const allWebinars = await webinarService.listWebinars({})
  logger.info(`Found ${allWebinars.length} webinars. Linking speaker_id...`)

  let linkedWebinarsCount = 0
  for (const webinar of allWebinars) {
    let matchedSpeaker: any = null

    for (const [key, speaker] of createdSpeakersMap.entries()) {
      if (webinar.speaker_name && webinar.speaker_name.toLowerCase().includes(key.split(",")[0].toLowerCase())) {
        matchedSpeaker = speaker
        break
      }
    }

    if (matchedSpeaker) {
      logger.info(`Linking webinar "${webinar.title}" to speaker ${matchedSpeaker.name} (${matchedSpeaker.id})`)
      await webinarService.updateWebinars({
        id: webinar.id,
        speaker_id: matchedSpeaker.id,
        speaker_name: matchedSpeaker.name,
        speaker_title: matchedSpeaker.designation || webinar.speaker_title,
        speaker_photo: matchedSpeaker.photo_url || webinar.speaker_photo,
        speaker_bio: matchedSpeaker.bio || webinar.speaker_bio,
      })
      linkedWebinarsCount++
    }
  }

  const finalSpeakers = await (webinarService as any).listSpeakers({})
  logger.info("==================================================")
  logger.info(`SUCCESS: Speakers seeding complete!`)
  logger.info(`Total speakers in database: ${finalSpeakers.length}`)
  logger.info(`Total webinars linked to speaker_id: ${linkedWebinarsCount}`)
  logger.info("==================================================")
}
