const { Client } = require("pg");

async function seedWebinarFiles() {
  console.log("Seeding Webinar Files table...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
  });
  await client.connect();

  try {
    const webs = await client.query("SELECT id, title, slug FROM webinar");
    console.log(`Found ${webs.rows.length} webinars`);

    for (const w of webs.rows) {
      const existing = await client.query("SELECT id FROM webinar_file WHERE webinar_id = $1", [w.id]);
      if (existing.rows.length === 0) {
        const cleanId = w.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8);

        // 1. Presentation Slides & Study Guide (PDF) - for download / all
        await client.query(
          `INSERT INTO webinar_file (
            id, webinar_id, purchase_option, material_type, title, description,
            s3_key, s3_bucket, s3_region, file_name, file_size, mime_type,
            is_active, display_order, upload_status, created_at, updated_at
          ) VALUES (
            $1, $2, 'pdf', 'slides', $3, $4, $5, 'academyio-private-webinars', 'us-east-1', $6, $7, 'application/pdf', true, 1, 'completed', NOW(), NOW()
          )`,
          [
            `wfile_slides_${cleanId}`,
            w.id,
            `${w.title} - Official Presentation Slides & Guide`,
            "Full comprehensive slide deck with instructor notes, statutory citations, and audit references.",
            `webinars/${w.id}/slides/${w.slug}-slides.pdf`,
            `${w.slug}-slides.pdf`,
            3850000,
          ]
        );

        // 2. Practice Checklists & Calculation Worksheet (PDF/Worksheet) - for download / all
        await client.query(
          `INSERT INTO webinar_file (
            id, webinar_id, purchase_option, material_type, title, description,
            s3_key, s3_bucket, s3_region, file_name, file_size, mime_type,
            is_active, display_order, upload_status, created_at, updated_at
          ) VALUES (
            $1, $2, 'pdf', 'worksheet', $3, $4, $5, 'academyio-private-webinars', 'us-east-1', $6, $7, 'application/pdf', true, 2, 'completed', NOW(), NOW()
          )`,
          [
            `wfile_sheet_${cleanId}`,
            w.id,
            `${w.title} - Compliance Checklist & Decision Worksheet`,
            "Practical step-by-step audit decision trees, checklists, and Excel/PDF formulas.",
            `webinars/${w.id}/worksheets/${w.slug}-compliance-worksheet.pdf`,
            `${w.slug}-compliance-worksheet.pdf`,
            2150000,
          ]
        );

        // 3. Verbatim Transcript (PDF) - for transcript / all
        await client.query(
          `INSERT INTO webinar_file (
            id, webinar_id, purchase_option, material_type, title, description,
            s3_key, s3_bucket, s3_region, file_name, file_size, mime_type,
            is_active, display_order, upload_status, created_at, updated_at
          ) VALUES (
            $1, $2, 'transcript', 'transcript', $3, $4, $5, 'academyio-private-webinars', 'us-east-1', $6, $7, 'application/pdf', true, 3, 'completed', NOW(), NOW()
          )`,
          [
            `wfile_trns_${cleanId}`,
            w.id,
            `${w.title} - Full Verbatim Written Transcript`,
            "Time-stamped full transcript covering all speaker lectures, attendee Q&A, and case study discussions.",
            `webinars/${w.id}/transcripts/${w.slug}-verbatim-transcript.pdf`,
            `${w.slug}-verbatim-transcript.pdf`,
            1420000,
          ]
        );

        // 4. HD Video Recording Master (MP4) - for recording / all
        await client.query(
          `INSERT INTO webinar_file (
            id, webinar_id, purchase_option, material_type, title, description,
            s3_key, s3_bucket, s3_region, file_name, file_size, mime_type,
            is_active, display_order, upload_status, created_at, updated_at
          ) VALUES (
            $1, $2, 'recording', 'recording', $3, $4, $5, 'academyio-private-webinars', 'us-east-1', $6, $7, 'video/mp4', true, 4, 'completed', NOW(), NOW()
          )`,
          [
            `wfile_rec_${cleanId}`,
            w.id,
            `${w.title} - 1080p HD Video Recording Master`,
            "High-definition master video recording with synchronized speaker audio and presentation slides.",
            `webinars/${w.id}/recordings/${w.slug}-recording-1080p.mp4`,
            `${w.slug}-recording-1080p.mp4`,
            485000000,
          ]
        );
      }
    }

    const countRes = await client.query("SELECT COUNT(*) FROM webinar_file");
    console.log(`✅ Success! Total webinar files in database: ${countRes.rows[0].count}`);
  } catch (err) {
    console.error("Error seeding webinar files:", err);
  } finally {
    await client.end();
  }
}

seedWebinarFiles();
