const { Client } = require("pg");
const crypto = require("crypto");

function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString("hex");
  return `${prefix}_01${timestamp}${random}`.slice(0, 32);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}

const STANDARD_OPTIONS = [
  {
    type: "live",
    skuSuffix: "LIVE",
    title: "Live Webinar Access",
    defaultPrice: 149,
    order: 1,
    includes: { live: true, recording: false, transcript: false, pdf: false },
  },
  {
    type: "recording",
    skuSuffix: "REC",
    title: "Recorded Webinar",
    defaultPrice: 149,
    order: 2,
    includes: { live: false, recording: true, transcript: false, pdf: false },
  },
  {
    type: "transcript",
    skuSuffix: "TRS",
    title: "Webinar Transcript",
    defaultPrice: 49,
    order: 3,
    includes: { live: false, recording: false, transcript: true, pdf: false },
  },
  {
    type: "bundle",
    skuSuffix: "BND",
    title: "Complete Package (All Included)",
    defaultPrice: 249,
    order: 4,
    includes: { live: true, recording: true, transcript: true, pdf: true },
  },
];

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon DB successfully.");

  const defaultSalesChannelId = "sc_01M4N9A6FJSGGYV3073E4N8NT5";

  // Fetch all webinars
  const webinarsRes = await client.query(
    "SELECT id, title, slug, product_id FROM webinar ORDER BY created_at ASC"
  );
  console.log(`Found ${webinarsRes.rows.length} webinars.`);

  for (const webinar of webinarsRes.rows) {
    console.log(`\n======================================================`);
    console.log(`Processing Webinar: [${webinar.slug}] ${webinar.title}`);

    // 1. Resolve linked product
    let productId = webinar.product_id;
    if (productId) {
      const prodCheck = await client.query(
        "SELECT id FROM product WHERE id = $1",
        [productId]
      );
      if (!prodCheck.rows.length) {
        productId = null;
      }
    }

    if (!productId) {
      const prodByHandle = await client.query(
        "SELECT id FROM product WHERE handle = $1",
        [webinar.slug]
      );
      if (prodByHandle.rows.length) {
        productId = prodByHandle.rows[0].id;
        await client.query("UPDATE webinar SET product_id = $1 WHERE id = $2", [
          productId,
          webinar.id,
        ]);
        console.log(`Linked webinar to existing product ${productId}`);
      } else {
        productId = generateId("prod");
        await client.query(
          `INSERT INTO product (id, title, handle, description, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'published', NOW(), NOW())`,
          [productId, webinar.title, webinar.slug, webinar.title]
        );
        await client.query("UPDATE webinar SET product_id = $1 WHERE id = $2", [
          productId,
          webinar.id,
        ]);
        console.log(`Created new product ${productId} and linked to webinar`);
      }
    }

    // 2. Link product to sales channel
    const scCheck = await client.query(
      "SELECT id FROM product_sales_channel WHERE product_id = $1 AND sales_channel_id = $2",
      [productId, defaultSalesChannelId]
    );
    if (!scCheck.rows.length) {
      const pscId = generateId("prodsc");
      await client.query(
        `INSERT INTO product_sales_channel (id, product_id, sales_channel_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [pscId, productId, defaultSalesChannelId]
      );
      console.log(`Linked product ${productId} to sales channel ${defaultSalesChannelId}`);
    }

    // Short code for SKU (guaranteed unique via MD5 hash of webinar id)
    const shortCode = crypto.createHash("md5").update(webinar.id).digest("hex").slice(0, 6).toUpperCase();

    // Track used variant IDs for this webinar
    const claimedVariantIds = new Set();

    // 3. Process each standard option
    for (const opt of STANDARD_OPTIONS) {
      const targetSku = `WEB-${shortCode}-${opt.skuSuffix}`;

      // Check if variant with exact targetSku exists
      const exactSkuRes = await client.query(
        "SELECT * FROM product_variant WHERE product_id = $1 AND sku = $2 AND deleted_at IS NULL",
        [productId, targetSku]
      );

      let variant = null;
      if (exactSkuRes.rows.length && !claimedVariantIds.has(exactSkuRes.rows[0].id)) {
        variant = exactSkuRes.rows[0];
      }

      // If not found by exact SKU, find any unclaimed variant for this product
      if (!variant) {
        const unclaimedRes = await client.query(
          `SELECT * FROM product_variant 
           WHERE product_id = $1 AND deleted_at IS NULL 
             AND id NOT IN (${claimedVariantIds.size > 0 ? Array.from(claimedVariantIds).map((_, i) => `$${i + 2}`).join(",") : "''"})
           LIMIT 1`,
          claimedVariantIds.size > 0 ? [productId, ...Array.from(claimedVariantIds)] : [productId]
        );
        if (unclaimedRes.rows.length) {
          variant = unclaimedRes.rows[0];
        }
      }

      let variantId;
      if (variant) {
        variantId = variant.id;
        claimedVariantIds.add(variantId);
        // Update title and SKU so they match the option accurately
        await client.query(
          `UPDATE product_variant 
           SET title = $1, sku = $2, manage_inventory = false, allow_backorder = false, updated_at = NOW(), deleted_at = NULL 
           WHERE id = $3`,
          [opt.title, targetSku, variantId]
        );
        console.log(`  Updated variant ${variantId} -> "${opt.title}" (${targetSku})`);
      } else {
        variantId = generateId("variant");
        claimedVariantIds.add(variantId);
        await client.query(
          `INSERT INTO product_variant (id, title, sku, product_id, manage_inventory, allow_backorder, created_at, updated_at)
           VALUES ($1, $2, $3, $4, false, false, NOW(), NOW())`,
          [variantId, opt.title, targetSku, productId]
        );
        console.log(`  Created variant ${variantId} -> "${opt.title}" (${targetSku})`);
      }

      // 4. Ensure price set and prices exist
      let priceSetId;
      const pvpsRes = await client.query(
        "SELECT price_set_id FROM product_variant_price_set WHERE variant_id = $1",
        [variantId]
      );
      if (pvpsRes.rows.length && pvpsRes.rows[0].price_set_id) {
        priceSetId = pvpsRes.rows[0].price_set_id;
      } else {
        priceSetId = generateId("pset");
        await client.query(
          "INSERT INTO price_set (id, created_at, updated_at) VALUES ($1, NOW(), NOW())",
          [priceSetId]
        );
        const pvpsId = generateId("pvps");
        await client.query(
          "INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
          [pvpsId, variantId, priceSetId]
        );
      }

      // 5. Check if mapping exists to preserve any super admin custom price
      const mapRes = await client.query(
        "SELECT id, price FROM webinar_variant_mapping WHERE webinar_id = $1 AND option_type = $2",
        [webinar.id, opt.type]
      );
      const effectivePrice = (mapRes.rows.length && mapRes.rows[0].price != null) ? mapRes.rows[0].price : opt.defaultPrice;

      // Upsert USD and EUR price in price table with effective custom price
      for (const curr of ["usd", "eur"]) {
        const pCheck = await client.query(
          "SELECT id FROM price WHERE price_set_id = $1 AND currency_code = $2",
          [priceSetId, curr]
        );
        const rawAmount = JSON.stringify({ value: String(effectivePrice), precision: 20 });
        if (pCheck.rows.length) {
          await client.query(
            "UPDATE price SET amount = $1, raw_amount = $2, updated_at = NOW() WHERE id = $3",
            [effectivePrice, rawAmount, pCheck.rows[0].id]
          );
        } else {
          const priceId = generateId("price");
          await client.query(
            `INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())`,
            [priceId, priceSetId, curr, effectivePrice, rawAmount]
          );
        }
      }
      console.log(`    Price set ${priceSetId} synchronized to $${effectivePrice}`);

      // Ensure webinar_variant_mapping exists and links to variantId
      if (mapRes.rows.length) {
        const mId = mapRes.rows[0].id;
        await client.query(
          `UPDATE webinar_variant_mapping 
           SET variant_id = $1, title = $2, price = $3, currency_code = 'usd', is_enabled = true,
               order_index = $4, includes_live = $5, includes_recording = $6, includes_transcript = $7,
               includes_pdf = $8, deleted_at = NULL, updated_at = NOW()
           WHERE id = $9`,
          [
            variantId,
            opt.title,
            effectivePrice,
            opt.order,
            opt.includes.live,
            opt.includes.recording,
            opt.includes.transcript,
            opt.includes.pdf,
            mId,
          ]
        );
      } else {
        const mId = generateId("wvm");
        await client.query(
          `INSERT INTO webinar_variant_mapping 
           (id, webinar_id, variant_id, title, price, currency_code, option_type, includes_live, includes_recording, includes_transcript, includes_pdf, is_enabled, order_index, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'usd', $6, $7, $8, $9, $10, true, $11, NOW(), NOW())`,
          [
            mId,
            webinar.id,
            variantId,
            opt.title,
            effectivePrice,
            opt.type,
            opt.includes.live,
            opt.includes.recording,
            opt.includes.transcript,
            opt.includes.pdf,
            opt.order,
          ]
        );
      }
    }

    // 6. Clean up any invalid/synthetic mappings (e.g. var_fraud_..., var_hipaa_..., etc.)
    await client.query(
      `DELETE FROM webinar_variant_mapping 
       WHERE webinar_id = $1 
         AND (variant_id LIKE 'var_%' OR variant_id LIKE 'default_%')
         AND variant_id NOT IN (SELECT id FROM product_variant)`,
      [webinar.id]
    );
  }

  console.log("\n======================================================");
  console.log("All webinar variants, prices, and mappings successfully synchronized!");

  // Final verification check
  const verifyRes = await client.query(`
    SELECT w.slug, m.option_type, m.price, m.title as map_title, pv.title as pv_title, pv.sku, p.amount as usd_price
    FROM webinar w
    JOIN webinar_variant_mapping m ON m.webinar_id = w.id
    JOIN product_variant pv ON pv.id = m.variant_id
    JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
    JOIN price p ON p.price_set_id = pvps.price_set_id AND p.currency_code = 'usd'
    ORDER BY w.slug, m.order_index
  `);
  console.log(`\nVerified ${verifyRes.rows.length} active valid variants across all webinars:`);
  verifyRes.rows.forEach((r) => {
    console.log(`  [${r.slug}] ${r.option_type.padEnd(10)} | ${r.pv_title.padEnd(35)} | $${r.usd_price} | SKU: ${r.sku}`);
  });

  await client.end();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
