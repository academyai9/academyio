const { Client } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_eVfLTi3pF5CE@ep-calm-meadow-b4nc559a-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

async function purgePdfOptionAndCleanVariants() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon DB successfully.");

  try {
    // 1. Find all PDF standalone variant mappings
    const pdfMappingsRes = await client.query(`
      SELECT id, webinar_id, variant_id, option_type, title, price 
      FROM webinar_variant_mapping 
      WHERE option_type = 'pdf' 
         OR title ILIKE '%PDF Study Guide%' 
         OR title ILIKE '%PDF Download%'
    `);

    console.log(`Found ${pdfMappingsRes.rows.length} standalone PDF mappings to purge.`);

    const variantIdsToPurge = new Set();
    for (const m of pdfMappingsRes.rows) {
      if (m.variant_id) {
        variantIdsToPurge.add(m.variant_id);
      }
    }

    // Also find any product_variant with SKU ending in -PDF
    const pdfVariantsRes = await client.query(`
      SELECT id, title, sku FROM product_variant 
      WHERE sku LIKE '%-PDF%' OR sku LIKE '%-PDF-%' OR title ILIKE '%PDF Study Guide%'
    `);
    for (const pv of pdfVariantsRes.rows) {
      variantIdsToPurge.add(pv.id);
    }

    console.log(`Found ${variantIdsToPurge.size} variant IDs associated with standalone PDF options:`, Array.from(variantIdsToPurge));

    // 2. Clean up from cart_line_item
    for (const varId of variantIdsToPurge) {
      const cartDel = await client.query(`DELETE FROM cart_line_item WHERE variant_id = $1`, [varId]);
      if (cartDel.rowCount > 0) {
        console.log(`  Removed ${cartDel.rowCount} cart items for variant ${varId}`);
      }
    }

    // 3. Clean up customer_entitlement if any (entitlements for PDF resources are handled via complete bundle)
    for (const varId of variantIdsToPurge) {
      await client.query(`DELETE FROM customer_entitlement WHERE variant_id = $1`, [varId]).catch(() => {});
    }

    // 4. Delete mappings from webinar_variant_mapping
    const delMappingsRes = await client.query(`
      DELETE FROM webinar_variant_mapping 
      WHERE option_type = 'pdf' 
         OR title ILIKE '%PDF Study Guide%' 
         OR title ILIKE '%PDF Download%'
    `);
    console.log(`Deleted ${delMappingsRes.rowCount} standalone PDF rows from webinar_variant_mapping.`);

    // 5. Clean up product_variant_price_set and soft-delete/delete product_variant
    for (const varId of variantIdsToPurge) {
      // Check order_line_item first
      let orderCount = 0;
      try {
        const oRes = await client.query(`SELECT count(*) as count FROM order_line_item WHERE variant_id = $1`, [varId]);
        orderCount = parseInt(oRes.rows[0]?.count || "0", 10);
      } catch (e) {}

      await client.query(`DELETE FROM product_variant_price_set WHERE variant_id = $1`, [varId]).catch(() => {});
      await client.query(`DELETE FROM product_variant_option WHERE variant_id = $1`, [varId]).catch(() => {});
      await client.query(`UPDATE webinar_file SET variant_id = NULL WHERE variant_id = $1`, [varId]).catch(() => {});

      if (orderCount === 0) {
        await client.query(`DELETE FROM product_variant WHERE id = $1`, [varId]).catch(() => {});
        console.log(`  Permanently deleted variant ${varId} (0 historical orders).`);
      } else {
        await client.query(`UPDATE product_variant SET deleted_at = NOW() WHERE id = $1`, [varId]).catch(() => {});
        console.log(`  Soft-deleted variant ${varId} (has ${orderCount} historical orders).`);
      }
    }

    // 6. Fix order_index for remaining options per webinar
    const webinarsRes = await client.query(`SELECT id, title, slug FROM webinar ORDER BY created_at ASC`);
    for (const w of webinarsRes.rows) {
      const activeOptions = await client.query(`
        SELECT id, option_type, title, price 
        FROM webinar_variant_mapping 
        WHERE webinar_id = $1 AND deleted_at IS NULL 
        ORDER BY 
          CASE 
            WHEN option_type = 'bundle' THEN 1
            WHEN option_type = 'live' THEN 2
            WHEN option_type = 'recording' THEN 3
            WHEN option_type = 'transcript' THEN 4
            ELSE 5
          END,
          order_index ASC
      `, [w.id]);

      let idx = 1;
      for (const opt of activeOptions.rows) {
        await client.query(`UPDATE webinar_variant_mapping SET order_index = $1 WHERE id = $2`, [idx, opt.id]);
        idx++;
      }
    }

    // 7. Verify the remaining options for all webinars
    const finalCheck = await client.query(`
      SELECT w.slug, m.option_type, m.title, m.price, m.is_enabled, m.order_index
      FROM webinar_variant_mapping m
      JOIN webinar w ON w.id = m.webinar_id
      WHERE m.deleted_at IS NULL
      ORDER BY w.slug, m.order_index ASC
    `);

    console.log("\n================ VERIFIED WEBINAR PURCHASE OPTIONS ================");
    console.table(finalCheck.rows);

    const pdfCount = finalCheck.rows.filter(r => r.option_type === 'pdf' || r.title.toLowerCase().includes('pdf study guide')).length;
    console.log(`\nRemaining standalone PDF purchase options across all webinars: ${pdfCount} (Expected: 0)`);

  } finally {
    await client.end();
  }
}

purgePdfOptionAndCleanVariants().catch(err => {
  console.error("Error purging PDF options:", err);
  process.exit(1);
});
