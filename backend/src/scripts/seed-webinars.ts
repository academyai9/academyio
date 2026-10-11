import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

export default async function seedWebinars({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)
  const productModule = container.resolve(Modules.PRODUCT)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)

  logger.info("Starting Webinar Platform demo data seeding...")

  // Get default sales channel
  const salesChannels = await salesChannelService.listSalesChannels()
  const defaultSalesChannel = salesChannels.length ? salesChannels[0] : null

  const sampleWebinars = [
    {
      title: "S Corp Basis Analysis: Form 7203 Preparation and Basis Reconstruction",
      slug: "s-corp-basis-analysis-form-7203",
      short_description: "Master IRS Form 7203 compliance, shareholder debt basis vs stock basis reconstruction, and distribution tracking for S-Corporations.",
      description: `<p>The mandatory IRS Form 7203 has heightened scrutiny on S corporation shareholder basis calculations. Tax professionals face complex challenges in accurately tracking stock basis, debt basis, suspended losses, and nondeductible expenses under Section 1366 and 1367.</p>
      <h3>Key Topics Covered</h3>
      <ul>
        <li>Step-by-step preparation and review of IRS Form 7203 Schedules A, B, and C</li>
        <li>Proper ordering rules for income, distributions, losses, and nondeductible items</li>
        <li>Distinguishing open account debt from formal shareholder promissory notes</li>
        <li>Reconstructing missing historical basis for newly acquired tax clients</li>
        <li>Treatment of loan guarantees, back-to-back loans, and circular cash flows</li>
      </ul>`,
      featured_image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      speaker_name: "Barbara Weltman, Esq.",
      speaker_title: "Nationally Recognized Tax Attorney & Author",
      speaker_bio: "Barbara Weltman is an attorney specializing in taxation and author of J.K. Lasser's Small Business Taxes. Named one of the 100 Most Influential People in Accounting by Accounting Today.",
      speaker_photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
      event_date: new Date("2026-11-10T13:00:00-05:00"),
      start_time: "1:00 PM EST",
      end_time: "2:40 PM EST",
      timezone: "America/New_York",
      duration_minutes: 100,
      category: "Federal Taxation",
      tags: ["S-Corporation", "Form 7203", "Tax Basis", "IRS Compliance", "CPE"],
      learning_objectives: [
        "Analyze Form 7203 schedules and reporting obligations under IRS regulations.",
        "Apply the strict ordering rules for stock and debt basis calculations.",
        "Reconstruct multi-year shareholder basis histories when records are incomplete.",
        "Differentiate tax consequences of distributions in excess of basis."
      ],
      target_audience: "CPAs, EAs, Tax Attorneys, CFOs, and Senior Tax Preparers",
      cpe_credits: 2,
      max_attendees: 500,
      status: "published",
      is_featured: true,
      is_upcoming: true,
      is_ondemand: false,
      is_seminar: false,
      refund_policy: "Full refund available up to 24 hours prior to live event broadcast.",
      live_stream_url: "https://zoom.us/j/98421038592?pwd=AcademyWebinarSecureToken",
      live_instructions: "Please join the session 10 minutes prior to scheduled start. Live Q&A will be enabled via the interactive chat panel.",
      live_link_published: true,
      recording_url: "https://customer-assets.academyio.com/recordings/s-corp-basis-2026-master.mp4",
      recording_instructions: "Recording will be available within 24 hours after the live session.",
      transcript_content: "Welcome to today's masterclass on S Corporation Basis Analysis and Form 7203 Preparation...",
      transcript_file_url: "https://customer-assets.academyio.com/transcripts/s-corp-basis-form-7203-transcript.pdf",
      prices: {
        live: 149,
        recording: 149,
        transcript: 49,
        pdf: 29,
        bundle: 249,
      },
      resources: [
        {
          title: "Form 7203 Complete Audit & Compliance Checklist",
          description: "Comprehensive step-by-step checklist for shareholder basis verification and review.",
          file_name: "form_7203_compliance_checklist.pdf",
          file_url: "https://customer-assets.academyio.com/resources/form_7203_compliance_checklist.pdf",
          file_size: 2450000,
          access_type: "pdf",
        },
        {
          title: "Shareholder Debt Basis Reconstruction Worksheet (Excel/PDF)",
          description: "Multi-year calculation template for tracking shareholder debt restore rules.",
          file_name: "shareholder_debt_basis_worksheet.pdf",
          file_url: "https://customer-assets.academyio.com/resources/shareholder_debt_basis_worksheet.pdf",
          file_size: 1820000,
          access_type: "pdf",
        },
      ],
    },
    {
      title: "Partnership Capital Account Reconciliations & Form 1065 Schedule K-1 Masterclass",
      slug: "partnership-capital-account-reconciliations-k1",
      short_description: "Comprehensive multi-hour seminar on tax basis capital accounts, Section 704(c) allocations, and Form 1065 reporting.",
      description: `<p>Navigating the complex requirements for calculating and reporting tax capital accounts on Form 1065 Schedule K-1. This advanced seminar guides practitioners through practical reconciliation methods, Section 704(b) capital accounts, and Section 754 basis adjustments.</p>`,
      featured_image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
      speaker_name: "Greg White, CPA",
      speaker_title: "Tax Practice Advisor & Managing Partner",
      speaker_bio: "Greg White has practiced tax for over 35 years and taught extensively for the AICPA, state CPA societies, and leading continuing education providers nationwide.",
      speaker_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      event_date: new Date("2026-11-18T14:00:00-05:00"),
      start_time: "2:00 PM EST",
      end_time: "4:30 PM EST",
      timezone: "America/New_York",
      duration_minutes: 150,
      category: "Federal Taxation",
      tags: ["Partnerships", "Form 1065", "Schedule K-1", "Section 704(c)", "CPE Seminar"],
      learning_objectives: [
        "Reconcile tax basis capital accounts using the transactional approach.",
        "Calculate reverse Section 704(c) allocations upon revaluation events.",
        "Analyze Schedule M-2 reporting and partner-level tax impacts.",
      ],
      target_audience: "Senior Tax Managers, CPAs, Tax Directors",
      cpe_credits: 3,
      max_attendees: 300,
      status: "published",
      is_featured: true,
      is_upcoming: true,
      is_ondemand: false,
      is_seminar: true,
      refund_policy: "Full refund up to 48 hours prior to seminar start.",
      live_stream_url: "https://zoom.us/j/91283746501?pwd=SeminarPartnershipTaxSecureToken",
      live_instructions: "Seminar check-in begins at 1:45 PM EST. Materials and polling questions will be integrated live.",
      live_link_published: true,
      recording_url: null,
      recording_instructions: "Seminar recording will be processed and posted within 48 hours.",
      transcript_content: null,
      transcript_file_url: null,
      prices: {
        live: 189,
        recording: 189,
        transcript: 59,
        pdf: 39,
        bundle: 289,
      },
      resources: [
        {
          title: "Partnership Tax Capital Account Reconciliation Framework",
          description: "Authoritative handbook detailing tax basis capital accounting methods.",
          file_name: "partnership_capital_reconciliation_framework.pdf",
          file_url: "https://customer-assets.academyio.com/resources/partnership_capital_reconciliation_framework.pdf",
          file_size: 3400000,
          access_type: "pdf",
        },
      ],
    },
    {
      title: "GAAP Accounting Standards Update 2026: ASC 606 & Lease Accounting Audits",
      slug: "gaap-accounting-standards-update-2026",
      short_description: "Essential on-demand review of recent FASB updates, revenue recognition nuances under ASC 606, and ASC 842 lease compliance.",
      description: `<p>Stay ahead of current FASB Accounting Standards Updates (ASUs). This on-demand webinar provides immediately applicable guidance on complex revenue contract evaluations and lessee/lessor audit verification.</p>`,
      featured_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      speaker_name: "Jennifer Louis, CPA",
      speaker_title: "President of Emeritus Consulting Services",
      speaker_bio: "Jennifer Louis has over 25 years of experience in auditing and accounting education, previously serving as an audit manager at Deloitte.",
      speaker_photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
      event_date: new Date("2026-10-02T13:00:00-05:00"),
      start_time: "1:00 PM EST",
      end_time: "2:40 PM EST",
      timezone: "America/New_York",
      duration_minutes: 100,
      category: "Auditing & Accounting",
      tags: ["GAAP", "FASB", "ASC 606", "ASC 842", "On-Demand"],
      learning_objectives: [
        "Identify key changes in 2026 FASB Accounting Standards Updates.",
        "Evaluate multi-element revenue arrangements under ASC 606 five-step model.",
        "Audit right-of-use asset impairments and lease modifications.",
      ],
      target_audience: "Financial Auditors, Controllers, Accounting Managers",
      cpe_credits: 2,
      max_attendees: null,
      status: "published",
      is_featured: false,
      is_upcoming: false,
      is_ondemand: true,
      is_seminar: false,
      refund_policy: "On-demand self-study purchases are non-refundable once content is accessed.",
      live_stream_url: null,
      live_instructions: null,
      live_link_published: false,
      recording_url: "https://customer-assets.academyio.com/recordings/gaap-update-2026-full.mp4",
      recording_instructions: "Stream in high definition. You can resume playback at any time from your customer dashboard.",
      recording_expires_at: new Date("2027-10-01T23:59:59-05:00"),
      transcript_content: "Thank you for joining our GAAP 2026 updates course. Today we dive into the latest ASUs...",
      transcript_file_url: "https://customer-assets.academyio.com/transcripts/gaap-2026-standards-transcript.pdf",
      prices: {
        live: 139,
        recording: 139,
        transcript: 49,
        pdf: 29,
        bundle: 189,
      },
      resources: [
        {
          title: "ASC 606 & ASC 842 Practice Handbook & Decision Trees",
          description: "Visual decision trees and real-world audit disclosure examples.",
          file_name: "gaap_asc606_asc842_handbook.pdf",
          file_url: "https://customer-assets.academyio.com/resources/gaap_asc606_asc842_handbook.pdf",
          file_size: 4200000,
          access_type: "pdf",
        },
      ],
    },
    {
      title: "Corporate Federal Tax Strategies: Section 174 & Section 163(j) Optimization",
      slug: "corporate-tax-planning-section-174-163j",
      short_description: "Strategic guidance on managing R&E amortization under Section 174 and navigating business interest expense limitations under 163(j).",
      description: `<p>Corporate tax planning requires deep understanding of Section 174 specified research expenditures and the adjusted taxable income (ATI) computations governing Section 163(j). Learn how leading corporate tax departments are restructuring contracts and optimizing debt allocations.</p>`,
      featured_image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80",
      speaker_name: "David Peters, CPA, MST, CFP",
      speaker_title: "Founder, Peters Tax & Wealth Consulting",
      speaker_bio: "David Peters has over two decades of financial and tax consulting experience, providing strategic advisory services to middle-market corporations.",
      speaker_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
      event_date: new Date("2026-12-02T13:00:00-05:00"),
      start_time: "1:00 PM EST",
      end_time: "3:00 PM EST",
      timezone: "America/New_York",
      duration_minutes: 120,
      category: "Corporate Tax",
      tags: ["Section 174", "Section 163(j)", "Corporate Tax", "R&D", "CPE"],
      learning_objectives: [
        "Analyze software development cost amortization rules under Section 174.",
        "Calculate the 30% ATI limitation on corporate business interest under 163(j).",
        "Formulate tax-efficient financing and supply-chain structures.",
      ],
      target_audience: "Corporate Tax Directors, CPAs, Financial Analysts",
      cpe_credits: 2,
      max_attendees: 400,
      status: "published",
      is_featured: false,
      is_upcoming: true,
      is_ondemand: false,
      is_seminar: false,
      refund_policy: "Full refund up to 24 hours prior to live event broadcast.",
      live_stream_url: "https://zoom.us/j/93847281923?pwd=CorporateTaxLiveStreamToken",
      live_instructions: "Access link will be active 15 minutes before the scheduled start.",
      live_link_published: true,
      recording_url: null,
      recording_instructions: "Recording will be uploaded within 24 hours.",
      transcript_content: null,
      transcript_file_url: null,
      prices: {
        live: 159,
        recording: 159,
        transcript: 49,
        pdf: 29,
        bundle: 259,
      },
      resources: [
        {
          title: "Section 174 R&E Amortization Modeling Guide",
          description: "Technical review of domestic vs foreign research expenditure allocations.",
          file_name: "section_174_amortization_guide.pdf",
          file_url: "https://customer-assets.academyio.com/resources/section_174_amortization_guide.pdf",
          file_size: 2100000,
          access_type: "pdf",
        },
      ],
    },
    {
      title: "Estate, Trust & Wealth Preservation: High-Net-Worth Transfer Tax Strategies",
      slug: "estate-trust-wealth-preservation-strategies",
      short_description: "In-depth on-demand workshop on SLATs, GRATs, dynastic trusts, and navigating federal estate tax exemptions.",
      description: `<p>Strategic estate planning techniques to shelter wealth and minimize federal gift and generation-skipping transfer (GST) taxes. Explores Spousal Lifetime Access Trusts (SLATs), Grantor Retained Annuity Trusts (GRATs), and valuation discount planning.</p>`,
      featured_image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
      speaker_name: "Robert S. Keebler, CPA/PFS, MST, AEP",
      speaker_title: "Partner at Keebler & Associates, Hall of Fame Tax Educator",
      speaker_bio: "Bob Keebler is one of the nation's leading experts in estate, gift, and retirement distribution planning. Inducted into the Estate Planning Hall of Fame.",
      speaker_photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80",
      event_date: new Date("2026-09-15T14:00:00-05:00"),
      start_time: "2:00 PM EST",
      end_time: "4:00 PM EST",
      timezone: "America/New_York",
      duration_minutes: 120,
      category: "Estate & Financial Planning",
      tags: ["Estate Planning", "Trusts", "Wealth Preservation", "Gift Tax", "On-Demand"],
      learning_objectives: [
        "Structure SLATs to maximize asset protection while avoiding reciprocal trust doctrine.",
        "Calculate optimum annuity hurdles for zeroed-out GRATs.",
        "Implement generation-skipping transfer tax exemption allocations.",
      ],
      target_audience: "Estate Planners, CPAs, Wealth Advisors, Family Office Directors",
      cpe_credits: 2,
      max_attendees: null,
      status: "published",
      is_featured: false,
      is_upcoming: false,
      is_ondemand: true,
      is_seminar: false,
      refund_policy: "On-demand access non-refundable after purchase.",
      live_stream_url: null,
      live_instructions: null,
      live_link_published: false,
      recording_url: "https://customer-assets.academyio.com/recordings/estate-trust-masterclass.mp4",
      recording_instructions: "Full on-demand session with downloadable slides and trust agreement sample clauses.",
      recording_expires_at: new Date("2027-09-15T23:59:59-05:00"),
      transcript_content: "Welcome everyone to our deep dive on modern estate planning and transfer tax mitigation...",
      transcript_file_url: "https://customer-assets.academyio.com/transcripts/estate-trust-transcript.pdf",
      prices: {
        live: 149,
        recording: 149,
        transcript: 49,
        pdf: 29,
        bundle: 199,
      },
      resources: [
        {
          title: "Comprehensive Trust Drafting Clauses & Tax Checklist",
          description: "Tested sample trust language and GST allocation instructions.",
          file_name: "trust_drafting_clauses_checklist.pdf",
          file_url: "https://customer-assets.academyio.com/resources/trust_drafting_clauses_checklist.pdf",
          file_size: 3100000,
          access_type: "pdf",
        },
      ],
    },
    {
      title: "AI Tools in Modern Financial Auditing: Fraud Detection, Risk Assessment & Internal Controls",
      slug: "ai-tools-in-modern-financial-auditing",
      short_description: "Cutting-edge seminar on deploying machine learning and automated anomaly detection in corporate financial audits.",
      description: `<p>Artificial Intelligence is transforming audit methodologies. This interactive seminar demonstrates practical prompt engineering, automated journal entry anomaly testing, and governance frameworks for AI-assisted audit engagements.</p>`,
      featured_image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
      speaker_name: "Dr. Amanda Chen, Ph.D., CPA, CFE",
      speaker_title: "Professor of Accounting Information Systems & Forensic Auditing",
      speaker_bio: "Dr. Chen is an authority on algorithmic audit procedures and fraud analytics, advising national accounting standards bodies and global corporations.",
      speaker_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      event_date: new Date("2026-12-15T10:00:00-05:00"),
      start_time: "10:00 AM EST",
      end_time: "1:00 PM EST",
      timezone: "America/New_York",
      duration_minutes: 180,
      category: "Emerging Technology & Audit",
      tags: ["Artificial Intelligence", "Audit Analytics", "Fraud Detection", "Risk Assessment", "Seminar"],
      learning_objectives: [
        "Deploy automated anomaly detection algorithms on general ledger datasets.",
        "Establish audit documentation trails for generative AI analytical reviews.",
        "Evaluate algorithmic bias and internal controls under COSO framework.",
      ],
      target_audience: "Internal & External Auditors, Forensic Accountants, CFOs",
      cpe_credits: 3,
      max_attendees: 250,
      status: "published",
      is_featured: true,
      is_upcoming: true,
      is_ondemand: false,
      is_seminar: true,
      refund_policy: "Full refund available up to 48 hours prior to seminar start.",
      live_stream_url: "https://zoom.us/j/94829104859?pwd=AIAuditSeminarSecureToken2026",
      live_instructions: "Seminar includes hands-on data walkthroughs. Download dataset files prior to session.",
      live_link_published: true,
      recording_url: null,
      recording_instructions: "Seminar recording will be available within 48 hours.",
      transcript_content: null,
      transcript_file_url: null,
      prices: {
        live: 199,
        recording: 199,
        transcript: 69,
        pdf: 49,
        bundle: 299,
      },
      resources: [
        {
          title: "AI Audit Implementation Guide & Risk Matrix",
          description: "Technical framework for evaluating algorithmic internal controls.",
          file_name: "ai_audit_implementation_guide.pdf",
          file_url: "https://customer-assets.academyio.com/resources/ai_audit_implementation_guide.pdf",
          file_size: 3800000,
          access_type: "pdf",
        },
      ],
    },
  ]

  for (const item of sampleWebinars) {
    logger.info(`Seeding webinar: ${item.title}...`)

    // Check if webinar already exists
    const [existing] = await webinarService.listWebinars({ slug: item.slug })

    let webinar = existing
    if (!webinar) {
      webinar = await webinarService.createWebinars({
        title: item.title,
        slug: item.slug,
        short_description: item.short_description,
        description: item.description,
        featured_image: item.featured_image,
        speaker_name: item.speaker_name,
        speaker_title: item.speaker_title,
        speaker_bio: item.speaker_bio,
        speaker_photo: item.speaker_photo,
        event_date: item.event_date,
        start_time: item.start_time,
        end_time: item.end_time,
        timezone: item.timezone,
        duration_minutes: item.duration_minutes,
        category: item.category,
        tags: item.tags,
        learning_objectives: item.learning_objectives,
        target_audience: item.target_audience,
        cpe_credits: item.cpe_credits,
        max_attendees: item.max_attendees,
        status: item.status as any,
        is_featured: item.is_featured,
        is_upcoming: item.is_upcoming,
        is_ondemand: item.is_ondemand,
        is_seminar: item.is_seminar,
        refund_policy: item.refund_policy,
        live_stream_url: item.live_stream_url,
        live_instructions: item.live_instructions,
        live_link_published: item.live_link_published,
        recording_url: item.recording_url,
        recording_instructions: item.recording_instructions,
        recording_expires_at: item.recording_expires_at,
        transcript_content: item.transcript_content,
        transcript_file_url: item.transcript_file_url,
      })

      // Add resources
      for (const res of item.resources) {
        await webinarService.createWebinarResources({
          title: res.title,
          description: res.description,
          file_name: res.file_name,
          file_url: res.file_url,
          file_size: res.file_size,
          file_type: "pdf",
          access_type: res.access_type as any,
          is_published: true,
          webinar_id: webinar.id,
        })
      }

      // Create linked Medusa Product & Variants
      try {
        const product = await productModule.createProducts({
          title: item.title,
          handle: item.slug,
          description: item.short_description,
          status: "published",
          sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : [],
          options: [
            {
              title: "Purchase Option",
              values: [
                "Live Webinar Access",
                "Recorded Webinar",
                "Webinar Transcript",
                "PDF Download",
                "Complete Package: Live + Recording + Transcript + PDF",
              ],
            },
          ],
          variants: [
            {
              title: "Live Webinar Access",
              sku: `WEB-${webinar.id.slice(-6)}-LIVE`.toUpperCase(),
              options: { "Purchase Option": "Live Webinar Access" },
            },
            {
              title: "Recorded Webinar",
              sku: `WEB-${webinar.id.slice(-6)}-REC`.toUpperCase(),
              options: { "Purchase Option": "Recorded Webinar" },
            },
            {
              title: "Webinar Transcript",
              sku: `WEB-${webinar.id.slice(-6)}-TRS`.toUpperCase(),
              options: { "Purchase Option": "Webinar Transcript" },
            },
            {
              title: "PDF Download",
              sku: `WEB-${webinar.id.slice(-6)}-PDF`.toUpperCase(),
              options: { "Purchase Option": "PDF Download" },
            },
            {
              title: "Complete Package: Live + Recording + Transcript + PDF",
              sku: `WEB-${webinar.id.slice(-6)}-BND`.toUpperCase(),
              options: { "Purchase Option": "Complete Package: Live + Recording + Transcript + PDF" },
            },
          ],
        })

        await webinarService.updateWebinars({
          id: webinar.id,
          product_id: product.id,
        })

        // Map variants to access configurations
        const variantConfigs = [
          { type: "live", incLive: true, incRec: false, incTrs: false, incPdf: false },
          { type: "recording", incLive: false, incRec: true, incTrs: false, incPdf: false },
          { type: "transcript", incLive: false, incRec: false, incTrs: true, incPdf: false },
          { type: "pdf", incLive: false, incRec: false, incTrs: false, incPdf: true },
          { type: "bundle", incLive: true, incRec: true, incTrs: true, incPdf: true },
        ]

        for (let i = 0; i < product.variants.length; i++) {
          const v = product.variants[i]
          const cfg = variantConfigs[i] || variantConfigs[0]
          await webinarService.createWebinarVariantMappings({
            webinar_id: webinar.id,
            variant_id: v.id,
            option_type: cfg.type as any,
            includes_live: cfg.incLive,
            includes_recording: cfg.incRec,
            includes_transcript: cfg.incTrs,
            includes_pdf: cfg.incPdf,
          })
        }
      } catch (prodErr) {
        logger.warn(`Could not create product for ${item.title}: ${prodErr}`)
      }
    }
  }

  // Pre-seed sample entitlements for demo customer
  const demoCustomerId = "cus_demo_tax_professional"
  const demoCustomerEmail = "customer@academyio.com"

  logger.info("Seeding verified sample entitlements for demo customer...")
  const allWebinars = await webinarService.listWebinars()

  if (allWebinars.length > 0) {
    // 1. Give customer Complete Bundle to "S Corp Basis Analysis"
    const sCorp = allWebinars.find((w) => w.slug === "s-corp-basis-analysis-form-7203")
    if (sCorp) {
      const existingEnt = await webinarService.listCustomerEntitlements({
        customer_id: demoCustomerId,
        webinar: { id: sCorp.id },
      })
      if (!existingEnt.length) {
        await webinarService.createCustomerEntitlements({
          customer_id: demoCustomerId,
          customer_email: demoCustomerEmail,
          webinar_id: sCorp.id,
          order_id: "order_demo_1001",
          variant_title: "Complete Package: Live + Recording + Transcript + PDF",
          access_type: "bundle",
          status: "active",
          granted_at: new Date(),
          metadata: { note: "Verified sample bundle purchase" },
        })
      }
    }

    // 2. Give customer Recording + PDF access to GAAP 2026 on-demand
    const gaap = allWebinars.find((w) => w.slug === "gaap-accounting-standards-update-2026")
    if (gaap) {
      const existingEnt = await webinarService.listCustomerEntitlements({
        customer_id: demoCustomerId,
        webinar: { id: gaap.id },
      })
      if (!existingEnt.length) {
        await webinarService.createCustomerEntitlements({
          customer_id: demoCustomerId,
          customer_email: demoCustomerEmail,
          webinar_id: gaap.id,
          order_id: "order_demo_1002",
          variant_title: "Recorded Webinar",
          access_type: "recording",
          status: "active",
          granted_at: new Date(),
          metadata: { note: "Verified sample recording purchase" },
        })
        await webinarService.createCustomerEntitlements({
          customer_id: demoCustomerId,
          customer_email: demoCustomerEmail,
          webinar_id: gaap.id,
          order_id: "order_demo_1002",
          variant_title: "PDF Download",
          access_type: "pdf",
          status: "active",
          granted_at: new Date(),
          metadata: { note: "Verified sample PDF resource purchase" },
        })
      }
    }
  }

  logger.info("Finished seeding Webinar Platform demo data successfully!")
}
