import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DEFAULT_REFUND_POLICY, PolicyPageData } from "../../../../utils/policy-default"
import { DEFAULT_PRIVACY_POLICY } from "../../../../utils/privacy-default"

async function ensurePagesTable(pgConnection: any) {
  await pgConnection.raw(`
    CREATE TABLE IF NOT EXISTS content_pages (
      id VARCHAR(255) PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      subtitle TEXT,
      support_email VARCHAR(255) NOT NULL DEFAULT 'support@academyio.com',
      effective_date VARCHAR(255) DEFAULT 'October 14, 2026',
      sections JSONB NOT NULL,
      summary_rules JSONB,
      version INT NOT NULL DEFAULT 1,
      is_published BOOLEAN NOT NULL DEFAULT true,
      published_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS content_page_versions (
      id VARCHAR(255) PRIMARY KEY,
      page_id VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      subtitle TEXT,
      support_email VARCHAR(255) NOT NULL,
      effective_date VARCHAR(255),
      sections JSONB NOT NULL,
      summary_rules JSONB,
      version INT NOT NULL,
      saved_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { slug } = req.params as { slug: string }
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    await ensurePagesTable(pgConnection)

    const result = await pgConnection.raw(
      `SELECT * FROM content_pages WHERE slug = ? AND is_published = true LIMIT 1;`,
      [slug]
    )

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      return res.json({
        page: {
          id: row.id,
          slug: row.slug,
          title: row.title,
          subtitle: row.subtitle,
          support_email: row.support_email,
          effective_date: row.effective_date,
          version: Number(row.version) || 1,
          is_published: Boolean(row.is_published),
          published_at: row.published_at,
          updated_at: row.updated_at,
          sections: typeof row.sections === "string" ? JSON.parse(row.sections) : row.sections,
          summary_rules:
            typeof row.summary_rules === "string" ? JSON.parse(row.summary_rules) : row.summary_rules,
        },
      })
    }

    // If requesting refund-policy and not yet seeded, seed the default
    if (slug === "refund-policy") {
      await pgConnection.raw(
        `INSERT INTO content_pages (
          id, slug, title, subtitle, support_email, effective_date, sections, summary_rules, version, is_published, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, true, NOW())
        ON CONFLICT (slug) DO NOTHING;`,
        [
          DEFAULT_REFUND_POLICY.id,
          DEFAULT_REFUND_POLICY.slug,
          DEFAULT_REFUND_POLICY.title,
          DEFAULT_REFUND_POLICY.subtitle,
          DEFAULT_REFUND_POLICY.support_email,
          DEFAULT_REFUND_POLICY.effective_date,
          JSON.stringify(DEFAULT_REFUND_POLICY.sections),
          JSON.stringify(DEFAULT_REFUND_POLICY.summary_rules),
          DEFAULT_REFUND_POLICY.version,
        ]
      )

      return res.json({ page: DEFAULT_REFUND_POLICY })
    }

    // If requesting privacy-policy and not yet seeded, seed the default
    if (slug === "privacy-policy" || slug === "privacy") {
      await pgConnection.raw(
        `INSERT INTO content_pages (
          id, slug, title, subtitle, support_email, effective_date, sections, summary_rules, version, is_published, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, true, NOW())
        ON CONFLICT (slug) DO NOTHING;`,
        [
          DEFAULT_PRIVACY_POLICY.id,
          DEFAULT_PRIVACY_POLICY.slug,
          DEFAULT_PRIVACY_POLICY.title,
          DEFAULT_PRIVACY_POLICY.subtitle,
          DEFAULT_PRIVACY_POLICY.support_email,
          DEFAULT_PRIVACY_POLICY.effective_date,
          JSON.stringify(DEFAULT_PRIVACY_POLICY.sections),
          JSON.stringify([]),
          DEFAULT_PRIVACY_POLICY.version,
        ]
      )

      return res.json({ page: DEFAULT_PRIVACY_POLICY })
    }

    return res.status(404).json({ message: `Page '${slug}' not found` })
  } catch (err: any) {
    console.error(`Error fetching page ${slug}:`, err)
    if (slug === "refund-policy") {
      return res.json({ page: DEFAULT_REFUND_POLICY })
    }
    if (slug === "privacy-policy" || slug === "privacy") {
      return res.json({ page: DEFAULT_PRIVACY_POLICY })
    }
    return res.status(500).json({ message: "Failed to load page content", error: err.message })
  }
}
