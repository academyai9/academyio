const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

async function updateIrsCourseId() {
  const client = await pool.connect()
  try {
    console.log("Updating irs_course_id and organizations in webinar_credit_info...")

    // 1. Update irs_course_id
    const res1 = await client.query(`
      UPDATE webinar_credit_info
      SET irs_course_id = '####'
      WHERE irs_course_id LIKE '%PJGWS%' OR irs_course_id IS NOT NULL;
    `)
    console.log(`Updated ${res1.rowCount} rows for irs_course_id to '####'`)

    // 2. Update organizations JSONB array
    const allRows = await client.query(`
      SELECT id, organizations FROM webinar_credit_info WHERE organizations IS NOT NULL;
    `)

    let updatedOrgsCount = 0
    for (const row of allRows.rows) {
      if (Array.isArray(row.organizations)) {
        let changed = false
        const updatedOrgs = row.organizations.map((org) => {
          if (
            org.org_code === "irs" ||
            (org.course_id && typeof org.course_id === "string" && org.course_id.includes("PJGWS"))
          ) {
            changed = true
            return {
              ...org,
              course_id: "####",
            }
          }
          return org
        })

        if (changed) {
          await client.query(
            `UPDATE webinar_credit_info SET organizations = $1 WHERE id = $2;`,
            [JSON.stringify(updatedOrgs), row.id]
          )
          updatedOrgsCount++
        }
      }
    }
    console.log(`Updated ${updatedOrgsCount} rows for organizations JSONB array to use '####'`)

    // Verify
    const verifyRows = await client.query(`
      SELECT id, irs_course_id, organizations FROM webinar_credit_info;
    `)
    console.log("\nSample updated rows:")
    for (const r of verifyRows.rows.slice(0, 3)) {
      console.log("- ID:", r.id)
      console.log("  irs_course_id:", r.irs_course_id)
      console.log("  organizations:", JSON.stringify(r.organizations))
    }
  } finally {
    client.release()
    await pool.end()
  }
}

updateIrsCourseId()
  .then(() => {
    console.log("\nDatabase update completed successfully.")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Update failed:", err)
    process.exit(1)
  })
