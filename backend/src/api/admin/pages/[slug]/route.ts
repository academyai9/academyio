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

    // Ensure refund-policy exists
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
    }

    // Ensure privacy-policy exists
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
    }

    const pageRes = await pgConnection.raw(
      `SELECT * FROM content_pages WHERE slug = ? LIMIT 1;`,
      [slug]
    )

    if (!pageRes.rows || pageRes.rows.length === 0) {
      return res.status(404).json({ message: `Page '${slug}' not found` })
    }

    const row = pageRes.rows[0]
    const page: PolicyPageData = {
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
    }

    // Fetch previous versions
    const versionsRes = await pgConnection.raw(
      `SELECT id, version, title, support_email, effective_date, saved_by, created_at
       FROM content_page_versions
       WHERE slug = ?
       ORDER BY version DESC
       LIMIT 10;`,
      [slug]
    )

    return res.json({
      page,
      versions: versionsRes.rows || [],
    })
  } catch (err: any) {
    console.error(`Error loading admin page ${slug}:`, err)
    return res.status(500).json({ message: "Failed to load page", error: err.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { slug } = req.params as { slug: string }
  const body = req.body as Partial<PolicyPageData> & { saved_by?: string }
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    await ensurePagesTable(pgConnection)

    // Fetch current state to archive it into version history
    const currentRes = await pgConnection.raw(
      `SELECT * FROM content_pages WHERE slug = ? LIMIT 1;`,
      [slug]
    )

    if (currentRes.rows && currentRes.rows.length > 0) {
      const current = currentRes.rows[0]
      const versionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

      await pgConnection.raw(
        `INSERT INTO content_page_versions (
          id, page_id, slug, title, subtitle, support_email, effective_date, sections, summary_rules, version, saved_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, NOW());`,
        [
          versionId,
          current.id,
          current.slug,
          current.title,
          current.subtitle,
          current.support_email,
          current.effective_date,
          typeof current.sections === "string" ? current.sections : JSON.stringify(current.sections),
          typeof current.summary_rules === "string"
            ? current.summary_rules
            : JSON.stringify(current.summary_rules),
          Number(current.version) || 1,
          body.saved_by || "Admin",
        ]
      )
    }

    const nextVersion = currentRes.rows.length > 0 ? (Number(currentRes.rows[0].version) || 1) + 1 : 1

    const title = body.title || DEFAULT_REFUND_POLICY.title
    const subtitle = body.subtitle || DEFAULT_REFUND_POLICY.subtitle
    const support_email = body.support_email || DEFAULT_REFUND_POLICY.support_email
    const effective_date = body.effective_date || DEFAULT_REFUND_POLICY.effective_date
    const sections = body.sections || DEFAULT_REFUND_POLICY.sections
    const summary_rules = body.summary_rules || DEFAULT_REFUND_POLICY.summary_rules
    const is_published = body.is_published !== undefined ? Boolean(body.is_published) : true

    await pgConnection.raw(
      `INSERT INTO content_pages (
        id, slug, title, subtitle, support_email, effective_date, sections, summary_rules, version, is_published, published_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        support_email = EXCLUDED.support_email,
        effective_date = EXCLUDED.effective_date,
        sections = EXCLUDED.sections,
        summary_rules = EXCLUDED.summary_rules,
        version = EXCLUDED.version,
        is_published = EXCLUDED.is_published,
        published_at = CASE WHEN EXCLUDED.is_published THEN NOW() ELSE content_pages.published_at END,
        updated_at = NOW();`,
      [
        `page_${slug.replace(/-/g, "_")}`,
        slug,
        title,
        subtitle,
        support_email,
        effective_date,
        JSON.stringify(sections),
        JSON.stringify(summary_rules),
        nextVersion,
        is_published,
      ]
    )

    const updatedRes = await pgConnection.raw(
      `SELECT * FROM content_pages WHERE slug = ? LIMIT 1;`,
      [slug]
    )

    const row = updatedRes.rows[0]
    return res.json({
      message: "Refund policy published successfully",
      page: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        support_email: row.support_email,
        effective_date: row.effective_date,
        version: Number(row.version),
        is_published: Boolean(row.is_published),
        published_at: row.published_at,
        updated_at: row.updated_at,
        sections: typeof row.sections === "string" ? JSON.parse(row.sections) : row.sections,
        summary_rules:
          typeof row.summary_rules === "string" ? JSON.parse(row.summary_rules) : row.summary_rules,
      },
    })
  } catch (err: any) {
    console.error(`Error saving admin page ${slug}:`, err)
    return res.status(500).json({ message: "Failed to publish page", error: err.message })
  }
}
