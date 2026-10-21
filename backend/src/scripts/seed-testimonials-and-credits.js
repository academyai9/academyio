const { Client } = require("pg")

const DATABASE_URL = process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa"

async function run() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log("Connected to PostgreSQL database...")

  try {
    // 1. Ensure Tables Exist
    console.log("Creating tables if not present...")
    await client.query(`
      CREATE TABLE IF NOT EXISTS "testimonial" (
        "id" text NOT NULL,
        "customer_name" text NOT NULL,
        "designation" text NOT NULL,
        "company" text NULL,
        "avatar_url" text NULL,
        "content" text NOT NULL,
        "rating" integer NOT NULL DEFAULT 5,
        "is_published" boolean NOT NULL DEFAULT true,
        "featured_homepage" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_testimonial_deleted_at" ON "testimonial" ("deleted_at") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_testimonial_published" ON "testimonial" ("is_published") WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS "accreditation_organization" (
        "id" text NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "short_name" text NOT NULL,
        "logo_url" text NOT NULL,
        "website_url" text NULL,
        "alt_text" text NOT NULL,
        "description" text NULL,
        "default_credit_type" text NOT NULL DEFAULT 'CPE Credits',
        "is_enabled" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "accreditation_organization_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "accreditation_organization_code_unique" UNIQUE ("code")
      );
      CREATE INDEX IF NOT EXISTS "IDX_accreditation_org_deleted_at" ON "accreditation_organization" ("deleted_at") WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS "webinar_credit_info" (
        "id" text NOT NULL,
        "webinar_id" text NOT NULL,
        "cpe_credit" numeric NOT NULL DEFAULT 2.0,
        "field_of_study" text NOT NULL DEFAULT 'Taxes',
        "prerequisites" text NOT NULL DEFAULT 'None',
        "learning_level" text NOT NULL DEFAULT 'Basic',
        "location" text NOT NULL DEFAULT 'Virtual/Online',
        "delivery_method" text NOT NULL DEFAULT 'Group Internet Based',
        "irs_course_id" text NULL,
        "attendance_requirement" text NOT NULL DEFAULT 'Yes',
        "session_duration" text NOT NULL DEFAULT '100 Minutes',
        "case_studies_qna" text NOT NULL DEFAULT 'Included',
        "presentation_reference" text NOT NULL DEFAULT 'Available for reference',
        "credit_unit" text NOT NULL DEFAULT 'Credits',
        "additional_notes" text NULL,
        "organizations" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "webinar_credit_info_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "webinar_credit_info_webinar_id_unique" UNIQUE ("webinar_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_webinar_credit_info_webinar_id" ON "webinar_credit_info" ("webinar_id") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_webinar_credit_info_deleted_at" ON "webinar_credit_info" ("deleted_at") WHERE deleted_at IS NULL;
    `)
    console.log("✓ Database tables verified.")

    // 2. Seed Official Accreditation Organizations
    console.log("Seeding official accreditation organizations...")
    const organizations = [
      {
        id: "org_irs",
        code: "irs",
        name: "Internal Revenue Service",
        short_name: "IRS",
        logo_url: "/logos/irs.svg",
        website_url: "https://www.irs.gov/tax-professionals/continuing-education-for-tax-professionals",
        alt_text: "IRS Approved Continuing Education Provider",
        description: "AcademyIO is recognized as an approved Continuing Education Provider by the IRS Return Preparer Office. Select tax programs qualify for continuing education credit for Enrolled Agents (EAs) and other Tax Return Preparers.",
        default_credit_type: "CE Credits",
        is_enabled: true,
        display_order: 1,
      },
      {
        id: "org_nasba",
        code: "nasba",
        name: "National Association of State Boards of Accountancy",
        short_name: "NASBA",
        logo_url: "/logos/nasba.svg",
        website_url: "https://www.nasbaregistry.org",
        alt_text: "NASBA National Registry of CPE Sponsors",
        description: "Registered with the National Association of State Boards of Accountancy (NASBA) as a sponsor of continuing professional education on the National Registry of CPE Sponsors. State boards of accountancy hold final authority on individual course acceptance.",
        default_credit_type: "CPE Credits",
        is_enabled: true,
        display_order: 2,
      },
      {
        id: "org_hrci",
        code: "hrci",
        name: "HR Certification Institute",
        short_name: "HRCI",
        logo_url: "/logos/hrci.svg",
        website_url: "https://www.hrci.org",
        alt_text: "HRCI Approved Provider",
        description: "This program has been approved for recertification credit hours through the HR Certification Institute (HRCI) for aPHR®, PHR®, PHRca®, SPHR®, GPHR®, PHRi™, and SPHRi™ certifications.",
        default_credit_type: "HR (General) Recertification Credits",
        is_enabled: true,
        display_order: 3,
      },
      {
        id: "org_shrm",
        code: "shrm",
        name: "Society for Human Resource Management",
        short_name: "SHRM",
        logo_url: "/logos/shrm.svg",
        website_url: "https://www.shrm.org",
        alt_text: "SHRM Recertification Provider",
        description: "AcademyIO is recognized by SHRM to offer Professional Development Credits (PDCs) for SHRM-CP® or SHRM-SCP® recertification credentials.",
        default_credit_type: "SHRM PDCs",
        is_enabled: true,
        display_order: 4,
      },
    ]

    for (const org of organizations) {
      await client.query(`
        INSERT INTO accreditation_organization (
          id, code, name, short_name, logo_url, website_url, alt_text, description, default_credit_type, is_enabled, display_order, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          logo_url = EXCLUDED.logo_url,
          website_url = EXCLUDED.website_url,
          alt_text = EXCLUDED.alt_text,
          description = EXCLUDED.description,
          default_credit_type = EXCLUDED.default_credit_type,
          is_enabled = EXCLUDED.is_enabled,
          display_order = EXCLUDED.display_order,
          updated_at = now()
      `, [
        org.id, org.code, org.name, org.short_name, org.logo_url, org.website_url, org.alt_text,
        org.description, org.default_credit_type, org.is_enabled, org.display_order
      ])
    }
    console.log("✓ 4 official accreditation organizations seeded.")

    // 3. Seed Professional Client Testimonials
    console.log("Seeding professional client testimonials...")
    const testimonials = [
      {
        id: "testim_01",
        customer_name: "David M. Sterling, CPA",
        designation: "Managing Partner, Tax & Advisory Practice",
        company: "Sterling & Higgins CPAs, LLP",
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        content: "AcademyIO’s S-Corp Basis and Form 7203 masterclasses are the clearest, most practical CPE sessions our firm has attended. The instructor calculation worksheets saved our preparers hours of manual reconciliations during filing season. Fast, instant certificate delivery is a huge plus.",
        rating: 5,
        is_published: true,
        featured_homepage: true,
        display_order: 1,
      },
      {
        id: "testim_02",
        customer_name: "Rebecca Thorne, EA, USTCP",
        designation: "Principal Enrolled Agent & Tax Litigation Specialist",
        company: "Thorne Tax Representation",
        avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
        content: "The IRS Continuing Education credit reporting was seamless, and the depth of the partnership capital account reconciliations session was outstanding. The verbatim transcripts and referenced tax codes allow us to train junior associates throughout the year.",
        rating: 5,
        is_published: true,
        featured_homepage: true,
        display_order: 2,
      },
      {
        id: "testim_03",
        customer_name: "Arthur Vance, CPA, CIA",
        designation: "Senior Director of Internal Audit & Risk",
        company: "Pacific Financial Corporation",
        avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        content: "We utilized AcademyIO's self-study programs for our audit department’s annual NASBA compliance. The forensic accounting and SOC 2 cloud control modules were rigorous, up to date with 2026 standards, and immediately applicable to our control testing.",
        rating: 5,
        is_published: true,
        featured_homepage: true,
        display_order: 3,
      },
      {
        id: "testim_04",
        customer_name: "Danielle Martinez, SHRM-SCP, SPHR",
        designation: "Vice President of People Operations & Total Rewards",
        company: "Nexus Health Systems",
        avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        content: "Multi-state payroll compliance and FLSA exemptions can be a minefield. The instructor addressed real-world remote work withholding cases with precision. Both our HRCI recertification credits and SHRM PDCs were validated and downloadable immediately upon passing the post-event quiz.",
        rating: 5,
        is_published: true,
        featured_homepage: true,
        display_order: 4,
      },
      {
        id: "testim_05",
        customer_name: "Michael Chen, CPA, CMA",
        designation: "Corporate Controller",
        company: "Vanguard Logistics Global",
        avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
        content: "The GAAP update on ASC 842 lease modifications delivered exactly what our accounting team needed without any fluff. Highly recommended for busy controllers who need accredited CPE with high educational value.",
        rating: 5,
        is_published: true,
        featured_homepage: true,
        display_order: 5,
      },
      {
        id: "testim_06",
        customer_name: "Karen S. O'Connor, CHC, CCEP",
        designation: "Chief Compliance Officer",
        company: "Heritage Regional Hospital Network",
        avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        content: "AcademyIO’s HIPAA Security Rule masterclass gave our clinical leadership clear, audit-ready procedures for business associate agreements and breach notification protocols. Excellent slide references and expert instruction.",
        rating: 5,
        is_published: true,
        featured_homepage: true,
        display_order: 6,
      },
    ]

    for (const t of testimonials) {
      await client.query(`
        INSERT INTO testimonial (
          id, customer_name, designation, company, avatar_url, content, rating, is_published, featured_homepage, display_order, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          designation = EXCLUDED.designation,
          company = EXCLUDED.company,
          avatar_url = EXCLUDED.avatar_url,
          content = EXCLUDED.content,
          rating = EXCLUDED.rating,
          is_published = EXCLUDED.is_published,
          featured_homepage = EXCLUDED.featured_homepage,
          display_order = EXCLUDED.display_order,
          updated_at = now()
      `, [
        t.id, t.customer_name, t.designation, t.company, t.avatar_url, t.content,
        t.rating, t.is_published, t.featured_homepage, t.display_order
      ])
    }
    console.log(`✓ ${testimonials.length} client testimonials seeded.`)

    // 4. Seed Webinar Credits and Educational Information for all existing webinars
    console.log("Seeding webinar credits and educational information...")
    const webinarsRes = await client.query(`SELECT id, title, slug, category, cpe_credits FROM webinar WHERE deleted_at IS NULL;`)
    const webinars = webinarsRes.rows
    console.log(`Found ${webinars.length} webinars to configure credits for...`)

    for (const w of webinars) {
      const cpe = Number(w.cpe_credits) || 2.0
      let fieldOfStudy = "Taxes"
      let learningLevel = "Intermediate"
      let irsCourseId = null
      let assignedOrgs = []

      const catLower = (w.category || "").toLowerCase()
      const titleLower = (w.title || "").toLowerCase()

      if (catLower.includes("human") || catLower.includes("payroll") || titleLower.includes("flsa")) {
        fieldOfStudy = "Personnel / Human Resources"
        learningLevel = "Intermediate"
        assignedOrgs = [
          {
            org_code: "hrci",
            credit_type: "HR (General) Credits",
            credit_amount: `${cpe}.0`,
            course_id: "HRCI-ACT-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "Workforce Compliance",
            is_verified: true,
            status: "Pre-Approved",
          },
          {
            org_code: "shrm",
            credit_type: "SHRM PDCs",
            credit_amount: `${cpe}.0`,
            course_id: "SHRM-PDC-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "HR Expertise",
            is_verified: true,
            status: "PDC Eligible",
          },
        ]
      } else if (catLower.includes("health") || titleLower.includes("hipaa")) {
        fieldOfStudy = "Regulatory Ethics & Compliance"
        learningLevel = "Basic"
        assignedOrgs = [
          {
            org_code: "nasba",
            credit_type: "CPE Credits",
            credit_amount: `${cpe}.0`,
            course_id: "NASBA-REG-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "Specialized Knowledge",
            is_verified: true,
            status: "Registry Approved",
          },
        ]
      } else if (catLower.includes("tax") || titleLower.includes("form") || titleLower.includes("tax")) {
        fieldOfStudy = "Taxes"
        irsCourseId = "####"
        learningLevel = titleLower.includes("advanced") ? "Advanced" : "Intermediate"
        assignedOrgs = [
          {
            org_code: "irs",
            credit_type: "CE Credits",
            credit_amount: `${cpe}.0`,
            course_id: irsCourseId,
            field_of_study: "Federal Tax Law",
            is_verified: true,
            status: "Approved",
          },
          {
            org_code: "nasba",
            credit_type: "CPE Credits",
            credit_amount: `${cpe}.0`,
            course_id: "NASBA-REG-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "Taxes",
            is_verified: true,
            status: "Registry Approved",
          },
        ]
      } else if (catLower.includes("human") || catLower.includes("payroll") || titleLower.includes("flsa")) {
        fieldOfStudy = "Personnel / Human Resources"
        learningLevel = "Intermediate"
        assignedOrgs = [
          {
            org_code: "hrci",
            credit_type: "HR (General) Credits",
            credit_amount: `${cpe}.0`,
            course_id: "HRCI-ACT-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "Workforce Compliance",
            is_verified: true,
            status: "Pre-Approved",
          },
          {
            org_code: "shrm",
            credit_type: "SHRM PDCs",
            credit_amount: `${cpe}.0`,
            course_id: "SHRM-PDC-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "HR Expertise",
            is_verified: true,
            status: "PDC Eligible",
          },
        ]
      } else if (catLower.includes("hous") || titleLower.includes("lihtc")) {
        fieldOfStudy = "Specialized Knowledge"
        learningLevel = "Intermediate"
        assignedOrgs = [
          {
            org_code: "nasba",
            credit_type: "CPE Credits",
            credit_amount: `${cpe}.0`,
            course_id: "NASBA-REG-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "Specialized Knowledge",
            is_verified: true,
            status: "Registry Approved",
          },
        ]
      } else {
        fieldOfStudy = "Information Technology"
        learningLevel = "Intermediate"
        assignedOrgs = [
          {
            org_code: "nasba",
            credit_type: "CPE Credits",
            credit_amount: `${cpe}.0`,
            course_id: "NASBA-REG-" + w.id.slice(-5).toUpperCase(),
            field_of_study: "Information Technology",
            is_verified: true,
            status: "Registry Approved",
          },
        ]
      }

      const creditId = `wci_${w.id}`
      await client.query(`
        INSERT INTO webinar_credit_info (
          id, webinar_id, cpe_credit, field_of_study, prerequisites, learning_level,
          location, delivery_method, irs_course_id, attendance_requirement,
          session_duration, case_studies_qna, presentation_reference, credit_unit,
          additional_notes, organizations, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
        ON CONFLICT (webinar_id) DO UPDATE SET
          cpe_credit = EXCLUDED.cpe_credit,
          field_of_study = EXCLUDED.field_of_study,
          prerequisites = EXCLUDED.prerequisites,
          learning_level = EXCLUDED.learning_level,
          location = EXCLUDED.location,
          delivery_method = EXCLUDED.delivery_method,
          irs_course_id = EXCLUDED.irs_course_id,
          attendance_requirement = EXCLUDED.attendance_requirement,
          session_duration = EXCLUDED.session_duration,
          case_studies_qna = EXCLUDED.case_studies_qna,
          presentation_reference = EXCLUDED.presentation_reference,
          organizations = EXCLUDED.organizations,
          updated_at = now()
      `, [
        creditId,
        w.id,
        cpe,
        fieldOfStudy,
        "None",
        learningLevel,
        "Virtual/Online",
        "Group Internet Based",
        irsCourseId,
        "Yes",
        "100 Minutes",
        "Included",
        "Available for reference",
        "Credits",
        "To earn accredited CPE credits, participants must log in on time and actively respond to real-time verification polling checks throughout the broadcast.",
        JSON.stringify(assignedOrgs),
      ])
    }
    console.log(`✓ All ${webinars.length} webinars configured with tailored educational credits & organization assignments.`)

  } finally {
    await client.end()
    console.log("Database connection closed.")
  }
}

run().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
