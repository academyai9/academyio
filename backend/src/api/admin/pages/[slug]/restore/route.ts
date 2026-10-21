import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { slug } = req.params as { slug: string }
  const { version } = req.body as { version: number }
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  if (!version) {
    return res.status(400).json({ message: "Version number is required" })
  }

  try {
    const versionRes = await pgConnection.raw(
      `SELECT * FROM content_page_versions WHERE slug = ? AND version = ? LIMIT 1;`,
      [slug, version]
    )

    if (!versionRes.rows || versionRes.rows.length === 0) {
      return res.status(404).json({ message: `Version ${version} of '${slug}' not found` })
    }

    const archived = versionRes.rows[0]

    // Archive current page before restoring
    const currentRes = await pgConnection.raw(
      `SELECT * FROM content_pages WHERE slug = ? LIMIT 1;`,
      [slug]
    )
    if (currentRes.rows && currentRes.rows.length > 0) {
      const cur = currentRes.rows[0]
      const snapshotId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      await pgConnection.raw(
        `INSERT INTO content_page_versions (
          id, page_id, slug, title, subtitle, support_email, effective_date, sections, summary_rules, version, saved_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, NOW());`,
        [
          snapshotId,
          cur.id,
          cur.slug,
          cur.title,
          cur.subtitle,
          cur.support_email,
          cur.effective_date,
          typeof cur.sections === "string" ? cur.sections : JSON.stringify(cur.sections),
          typeof cur.summary_rules === "string"
            ? cur.summary_rules
            : JSON.stringify(cur.summary_rules),
          Number(cur.version) || 1,
          "Prior to Restore",
        ]
      )
    }

    const nextVer =
      currentRes.rows.length > 0 ? (Number(currentRes.rows[0].version) || 1) + 1 : Number(version) + 1

    await pgConnection.raw(
      `UPDATE content_pages SET
        title = ?,
        subtitle = ?,
        support_email = ?,
        effective_date = ?,
        sections = ?::jsonb,
        summary_rules = ?::jsonb,
        version = ?,
        is_published = true,
        updated_at = NOW()
      WHERE slug = ?;`,
      [
        archived.title,
        archived.subtitle,
        archived.support_email,
        archived.effective_date,
        typeof archived.sections === "string" ? archived.sections : JSON.stringify(archived.sections),
        typeof archived.summary_rules === "string"
          ? archived.summary_rules
          : JSON.stringify(archived.summary_rules),
        nextVer,
        slug,
      ]
    )

    const updated = await pgConnection.raw(
      `SELECT * FROM content_pages WHERE slug = ? LIMIT 1;`,
      [slug]
    )
    const row = updated.rows[0]

    return res.json({
      message: `Version ${version} restored successfully as Version ${nextVer}`,
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
    console.error(`Error restoring page version ${slug}:`, err)
    return res.status(500).json({ message: "Failed to restore version", error: err.message })
  }
}
