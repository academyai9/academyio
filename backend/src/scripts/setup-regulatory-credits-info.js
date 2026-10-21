const { Client } = require("pg");

async function run() {
  const connectionString = process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa";
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to Postgres. Running migrations for Regulatory Bodies, Credits, and Other Information...");

  // 1. Add show_on_homepage to accreditation_organization if not exists
  await client.query(`
    ALTER TABLE accreditation_organization 
    ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;
  `);
  console.log("Updated accreditation_organization table.");

  // 2. Create homepage_section_settings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS homepage_section_settings (
      section_key text NOT NULL PRIMARY KEY,
      is_enabled boolean NOT NULL DEFAULT true,
      title text NULL,
      subtitle text NULL,
      description text NULL,
      metadata jsonb NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log("Created homepage_section_settings table.");

  // Insert default settings if not exists
  await client.query(`
    INSERT INTO homepage_section_settings (section_key, is_enabled, title, subtitle, description)
    VALUES 
      ('regulatory_bodies', true, 'Recognized by Leading Professional Regulatory Bodies', 'Accredited Continuing Professional Education', 'Our course curricula and faculty masterclasses are designed in strict alignment with national continuing education standards.'),
      ('credits', true, 'Earn Certified Continuing Professional Education Credits', 'Accredited Professional Credentials', 'AcademyIO masterclasses qualify for nationally recognized professional credentials across accounting, taxation, and human resources.'),
      ('other_info', true, 'Continuing Education Standards & Compliance Disclosures', 'Important Program Guidelines', 'Essential regulatory details regarding attendance tracking, certificate delivery, and multi-state board reciprocity.')
    ON CONFLICT (section_key) DO UPDATE SET
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      description = EXCLUDED.description;
  `);

  // 3. Create credit_type table
  await client.query(`
    CREATE TABLE IF NOT EXISTS credit_type (
      id text NOT NULL PRIMARY KEY,
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      badge text NULL,
      description text NULL,
      category text NOT NULL,
      default_credit_hours text NOT NULL DEFAULT '1.0 - 2.0 Credits',
      organization_code text NULL,
      icon text NULL DEFAULT 'award',
      is_active boolean NOT NULL DEFAULT true,
      show_on_homepage boolean NOT NULL DEFAULT true,
      show_on_webinars boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      metadata jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_credit_type_code" ON credit_type (code);
    CREATE INDEX IF NOT EXISTS "IDX_credit_type_active" ON credit_type (is_active) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS "IDX_credit_type_homepage" ON credit_type (show_on_homepage) WHERE deleted_at IS NULL;
  `);
  console.log("Created credit_type table.");

  // Insert default credit types
  const defaultCredits = [
    {
      id: "ct_nasba_cpe",
      code: "cpe",
      name: "NASBA CPE Credits",
      badge: "CPE",
      description: "Continuing Professional Education credits accepted by State Boards of Accountancy across all 50 states under National Registry reciprocity.",
      category: "Accounting & Finance",
      default_credit_hours: "1.0 - 2.0 Credits",
      organization_code: "nasba",
      icon: "award",
      is_active: true,
      show_on_homepage: true,
      show_on_webinars: true,
      display_order: 1,
    },
    {
      id: "ct_irs_ce",
      code: "ce_irs",
      name: "IRS CE Credits",
      badge: "CE",
      description: "Official Continuing Education credits approved by the IRS Return Preparer Office for Enrolled Agents (EAs) and Tax Return Preparers.",
      category: "Taxation & Compliance",
      default_credit_hours: "1.0 - 2.0 Credits",
      organization_code: "irs",
      icon: "shield-check",
      is_active: true,
      show_on_homepage: true,
      show_on_webinars: true,
      display_order: 2,
    },
    {
      id: "ct_hrci_credit",
      code: "hrci",
      name: "HRCI Recertification Credits",
      badge: "HRCI",
      description: "Recertification credits approved for HR professionals holding aPHR, PHR, SPHR, and GPHR credentials through the HR Certification Institute.",
      category: "Human Resources & Payroll",
      default_credit_hours: "1.0 - 1.5 Hours",
      organization_code: "hrci",
      icon: "users",
      is_active: true,
      show_on_homepage: true,
      show_on_webinars: true,
      display_order: 3,
    },
    {
      id: "ct_shrm_pdc",
      code: "shrm",
      name: "SHRM Professional Development Credits",
      badge: "SHRM",
      description: "PDCs recognized by the Society for Human Resource Management toward SHRM-CP and SHRM-SCP credential recertification.",
      category: "Human Resources",
      default_credit_hours: "1.0 - 1.5 PDCs",
      organization_code: "shrm",
      icon: "book-open",
      is_active: true,
      show_on_homepage: true,
      show_on_webinars: true,
      display_order: 4,
    },
    {
      id: "ct_cle_credit",
      code: "cle",
      name: "CLE Continuing Legal Education",
      badge: "CLE",
      description: "Continuing legal education credits for attorneys, general counsel, and compliance officers covering federal tax controversies and business law.",
      category: "Legal & Taxation",
      default_credit_hours: "1.0 - 2.0 Hours",
      organization_code: null,
      icon: "award",
      is_active: true,
      show_on_homepage: true,
      show_on_webinars: true,
      display_order: 5,
    },
    {
      id: "ct_cfp_ce",
      code: "cfp",
      name: "CFP CE Credits",
      badge: "CFP",
      description: "Continuing Education credits for Certified Financial Planner professionals covering estate planning, wealth preservation, and tax strategy.",
      category: "Financial Planning",
      default_credit_hours: "1.0 - 2.0 Credits",
      organization_code: null,
      icon: "sparkles",
      is_active: true,
      show_on_homepage: true,
      show_on_webinars: true,
      display_order: 6,
    },
  ];

  for (const c of defaultCredits) {
    await client.query(`
      INSERT INTO credit_type (
        id, code, name, badge, description, category, default_credit_hours, 
        organization_code, icon, is_active, show_on_homepage, show_on_webinars, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        badge = EXCLUDED.badge,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        default_credit_hours = EXCLUDED.default_credit_hours,
        organization_code = EXCLUDED.organization_code,
        icon = EXCLUDED.icon,
        is_active = EXCLUDED.is_active,
        show_on_homepage = EXCLUDED.show_on_homepage,
        show_on_webinars = EXCLUDED.show_on_webinars,
        display_order = EXCLUDED.display_order,
        deleted_at = NULL;
    `, [
      c.id, c.code, c.name, c.badge, c.description, c.category, c.default_credit_hours,
      c.organization_code, c.icon, c.is_active, c.show_on_homepage, c.show_on_webinars, c.display_order
    ]);
  }
  console.log("Seeded default credit types.");

  // 4. Create other_information_item table
  await client.query(`
    CREATE TABLE IF NOT EXISTS other_information_item (
      id text NOT NULL PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL,
      icon text NULL DEFAULT 'info',
      image_url text NULL,
      link_url text NULL,
      link_text text NULL,
      badge text NULL,
      section text NOT NULL DEFAULT 'homepage',
      is_active boolean NOT NULL DEFAULT true,
      show_on_homepage boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      metadata jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_other_info_active" ON other_information_item (is_active) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS "IDX_other_info_homepage" ON other_information_item (show_on_homepage) WHERE deleted_at IS NULL;
  `);
  console.log("Created other_information_item table.");

  // Insert default other information items
  const defaultInfoItems = [
    {
      id: "info_polling_verification",
      title: "Attendance & Real-Time Polling Verification",
      description: "In accordance with NASBA QAS and IRS Continuing Education standards, participants in live webinars must respond to randomized attendance polling checks throughout the broadcast to qualify for official credit certification.",
      icon: "check-circle",
      image_url: null,
      link_url: "/us/faq",
      link_text: "Read Attendance Policy",
      badge: "Regulatory Compliance",
      section: "homepage",
      is_active: true,
      show_on_homepage: true,
      display_order: 1,
    },
    {
      id: "info_state_board_reciprocity",
      title: "50-State Accountancy Board Reciprocity",
      description: "CPE credits earned through AcademyIO are universally accepted by State Boards of Accountancy nationwide under the National Registry of CPE Sponsors agreement, fulfilling annual licensing requirements.",
      icon: "shield-check",
      image_url: null,
      link_url: "/us/about",
      link_text: "Learn About Accreditation",
      badge: "National Acceptance",
      section: "homepage",
      is_active: true,
      show_on_homepage: true,
      display_order: 2,
    },
    {
      id: "info_certificate_delivery",
      title: "Instant Digital Certificate Delivery",
      description: "Official certificates of completion featuring your name, printed IRS PTIN / CFP ID, accredited hours, and course verification numbers are issued instantly to your customer dashboard upon evaluation completion.",
      icon: "award",
      image_url: null,
      link_url: "/us/dashboard",
      link_text: "Customer Dashboard",
      badge: "Instant Fulfillment",
      section: "homepage",
      is_active: true,
      show_on_homepage: true,
      display_order: 3,
    },
    {
      id: "info_ondemand_access",
      title: "24/7 On-Demand Streaming & Materials",
      description: "All webinar registrations include 1 full year of streaming access to high-definition recordings, verbatim transcript documents, and downloadable slide deck presentations from any desktop or mobile device.",
      icon: "clock",
      image_url: null,
      link_url: "/us/webinars/self-study",
      link_text: "Explore Self-Study",
      badge: "1-Year Access",
      section: "homepage",
      is_active: true,
      show_on_homepage: true,
      display_order: 4,
    },
  ];

  for (const item of defaultInfoItems) {
    await client.query(`
      INSERT INTO other_information_item (
        id, title, description, icon, image_url, link_url, link_text, badge,
        section, is_active, show_on_homepage, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        image_url = EXCLUDED.image_url,
        link_url = EXCLUDED.link_url,
        link_text = EXCLUDED.link_text,
        badge = EXCLUDED.badge,
        section = EXCLUDED.section,
        is_active = EXCLUDED.is_active,
        show_on_homepage = EXCLUDED.show_on_homepage,
        display_order = EXCLUDED.display_order,
        deleted_at = NULL;
    `, [
      item.id, item.title, item.description, item.icon, item.image_url, item.link_url,
      item.link_text, item.badge, item.section, item.is_active, item.show_on_homepage, item.display_order
    ]);
  }
  console.log("Seeded default other information items.");

  await client.end();
  console.log("Database setup successfully completed.");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
