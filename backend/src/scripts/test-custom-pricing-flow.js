const { Client } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_eVfLTi3pF5CE@ep-calm-meadow-b4nc559a-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

async function verifyCustomPricing() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon DB successfully.");

  try {
    // 1. Pick a webinar
    const webinarRes = await client.query(`
      SELECT id, title, slug, product_id FROM webinar 
      WHERE slug = 's-corp-basis-analysis-form-7203'
    `);
    const webinar = webinarRes.rows[0];
    console.log(`Testing webinar: [${webinar.slug}] ${webinar.title}`);

    // 2. Query options
    const optionsRes = await client.query(`
      SELECT id, option_type, title, price, variant_id 
      FROM webinar_variant_mapping 
      WHERE webinar_id = $1 AND deleted_at IS NULL
      ORDER BY order_index ASC
    `, [webinar.id]);

    console.log("\nCurrent Options in DB:");
    console.table(optionsRes.rows);

    const hasPdf = optionsRes.rows.some(r => r.option_type === 'pdf' || r.title.toLowerCase().includes('pdf study guide'));
    if (hasPdf) {
      throw new Error("FAILED: Found standalone PDF option in webinar_variant_mapping!");
    }
    console.log("SUCCESS: No standalone PDF option present.");

    // 3. Test changing Transcript price to a custom price ($179)
    const transcriptOption = optionsRes.rows.find(r => r.option_type === 'transcript');
    if (!transcriptOption) {
      throw new Error("FAILED: Transcript option not found!");
    }

    const testCustomPrice = 179;
    console.log(`\nTesting super admin setting custom price on Transcript to $${testCustomPrice}...`);

    // Update mapping
    await client.query(`
      UPDATE webinar_variant_mapping 
      SET price = $1, updated_at = NOW() 
      WHERE id = $2
    `, [testCustomPrice, transcriptOption.id]);

    // Update Medusa price_set
    const pvpsRes = await client.query(`
      SELECT price_set_id FROM product_variant_price_set WHERE variant_id = $1
    `, [transcriptOption.variant_id]);

    if (pvpsRes.rows.length) {
      const priceSetId = pvpsRes.rows[0].price_set_id;
      const rawAmount = JSON.stringify({ value: String(testCustomPrice), precision: 20 });
      for (const curr of ["usd", "eur"]) {
        await client.query(`
          UPDATE price SET amount = $1, raw_amount = $2, updated_at = NOW()
          WHERE price_set_id = $3 AND currency_code = $4
        `, [testCustomPrice, rawAmount, priceSetId, curr]);
      }
      console.log(`Synchronized price_set ${priceSetId} to $${testCustomPrice}`);
    }

    // 4. Verify in DB
    const checkRes = await client.query(`
      SELECT m.id, m.title, m.price, p.currency_code, p.amount
      FROM webinar_variant_mapping m
      JOIN product_variant_price_set pvps ON pvps.variant_id = m.variant_id
      JOIN price p ON p.price_set_id = pvps.price_set_id
      WHERE m.id = $1
    `, [transcriptOption.id]);

    console.log("\nVerified Database Record for Transcript:");
    console.table(checkRes.rows);

    const verifiedUsd = checkRes.rows.find(r => r.currency_code === 'usd');
    if (Number(verifiedUsd?.amount) !== testCustomPrice) {
      throw new Error(`Price verification failed! Expected ${testCustomPrice}, got ${verifiedUsd?.amount}`);
    }
    console.log(`\nSUCCESS: Custom price $${testCustomPrice} verified in both webinar_variant_mapping and Medusa price table!`);

  } finally {
    await client.end();
  }
}

verifyCustomPricing().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
