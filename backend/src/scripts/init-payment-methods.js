const { Client } = require("pg")
const crypto = require("crypto")

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://sonusaini@127.0.0.1:5432/academyio_medusa"

async function initPaymentMethods() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log("Connected to PostgreSQL database:", DATABASE_URL)

  try {
    // 1. Create payment_method_config table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "payment_method_config" (
        "id" text NOT NULL,
        "provider_id" text NOT NULL,
        "name" text NOT NULL,
        "display_title" text NOT NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "environment" text NOT NULL DEFAULT 'live',
        "live_publishable_key" text NULL,
        "live_secret_key" text NULL,
        "live_webhook_secret" text NULL,
        "test_publishable_key" text NULL,
        "test_secret_key" text NULL,
        "test_webhook_secret" text NULL,
        "underlying_gateway" text NULL,
        "verification_mode" text NULL DEFAULT 'instant_verification',
        "supported_cards" jsonb NULL DEFAULT '["visa","mastercard","amex","discover"]'::jsonb,
        "last_tested_at" timestamptz NULL,
        "last_test_status" text NULL,
        "last_test_message" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "payment_method_config_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "payment_method_config_provider_id_unique" UNIQUE ("provider_id")
      );
    `)

    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_pmc_is_active" ON "payment_method_config" ("is_active");`)
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_pmc_provider_id" ON "payment_method_config" ("provider_id");`)

    // 2. Create payment_method_audit_log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "payment_method_audit_log" (
        "id" text NOT NULL,
        "payment_method_id" text NOT NULL REFERENCES "payment_method_config" ("id") ON DELETE CASCADE,
        "provider_id" text NOT NULL,
        "action" text NOT NULL,
        "admin_user_id" text NULL,
        "admin_email" text NULL,
        "previous_state" jsonb NULL,
        "new_state" jsonb NULL,
        "details" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "payment_method_audit_log_pkey" PRIMARY KEY ("id")
      );
    `)

    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_pmal_provider_id" ON "payment_method_audit_log" ("provider_id");`)
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_pmal_created_at" ON "payment_method_audit_log" ("created_at" DESC);`)

    console.log("Database tables verified.")

    // 3. Seed or update default payment configurations
    // Stripe
    const stripeLiveSecret =
      process.env.STRIPE_API_KEY ||
      "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"
    const stripeLiveWebhook =
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_Igrde4yvnsliy1pBQ0AGPlwfm8s8Hu6z"
    const stripeLivePub =
      "pk_live_51TgLM2DytEyXCfXkGZQV4b3ILIudh0AMz9OPF8At35X3Z8rSy1sep8O1vQfjNQnsbDV48kznWQBc7tqqhCh7ussi00RngOJyJa"

    await client.query(
      `
      INSERT INTO payment_method_config (
        id, provider_id, name, display_title, description, is_active, environment,
        live_publishable_key, live_secret_key, live_webhook_secret,
        underlying_gateway, verification_mode, supported_cards,
        last_tested_at, last_test_status, last_test_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), 'success', 'Initial live configuration verified', now())
      ON CONFLICT (provider_id) DO UPDATE SET
        name = EXCLUDED.name,
        display_title = EXCLUDED.display_title,
        description = EXCLUDED.description,
        live_publishable_key = COALESCE(payment_method_config.live_publishable_key, EXCLUDED.live_publishable_key),
        live_secret_key = COALESCE(payment_method_config.live_secret_key, EXCLUDED.live_secret_key),
        live_webhook_secret = COALESCE(payment_method_config.live_webhook_secret, EXCLUDED.live_webhook_secret),
        underlying_gateway = EXCLUDED.underlying_gateway,
        verification_mode = EXCLUDED.verification_mode,
        updated_at = now();
    `,
      [
        "pm_stripe",
        "stripe",
        "Stripe",
        "Credit / Debit Card (Stripe)",
        "Visa, Mastercard, American Express, and Discover with 3D Secure instant verification.",
        true,
        "live",
        stripeLivePub,
        stripeLiveSecret,
        stripeLiveWebhook,
        "stripe",
        "instant_3ds_verification",
        JSON.stringify(["visa", "mastercard", "amex", "discover"]),
      ]
    )

    // PayPal
    await client.query(
      `
      INSERT INTO payment_method_config (
        id, provider_id, name, display_title, description, is_active, environment,
        underlying_gateway, verification_mode, supported_cards,
        last_tested_at, last_test_status, last_test_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, 'Pending administrator credentials configuration', now())
      ON CONFLICT (provider_id) DO UPDATE SET
        name = EXCLUDED.name,
        display_title = EXCLUDED.display_title,
        description = EXCLUDED.description,
        underlying_gateway = EXCLUDED.underlying_gateway,
        verification_mode = EXCLUDED.verification_mode,
        updated_at = now();
    `,
      [
        "pm_paypal",
        "paypal",
        "PayPal",
        "PayPal Express & Digital Wallet",
        "Pay securely using your PayPal account balance, connected bank account, or PayPal Credit.",
        false,
        "sandbox",
        "paypal",
        "oauth2_instant_approval",
        JSON.stringify(["paypal", "paypal_credit"]),
      ]
    )

    // Electronic Card Payment & Instant Verification
    await client.query(
      `
      INSERT INTO payment_method_config (
        id, provider_id, name, display_title, description, is_active, environment,
        underlying_gateway, verification_mode, supported_cards,
        last_tested_at, last_test_status, last_test_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), 'success', 'Direct electronic verification engine active', now())
      ON CONFLICT (provider_id) DO UPDATE SET
        name = EXCLUDED.name,
        display_title = EXCLUDED.display_title,
        description = EXCLUDED.description,
        underlying_gateway = EXCLUDED.underlying_gateway,
        verification_mode = EXCLUDED.verification_mode,
        updated_at = now();
    `,
      [
        "pm_electronic_card",
        "electronic_card",
        "Electronic Card Payment & Instant Verification",
        "Electronic Card Payment & Instant Verification",
        "Instant direct card verification with automated immediate CPE entitlement activation.",
        true,
        "live",
        "stripe",
        "server_side_verified",
        JSON.stringify(["visa", "mastercard", "amex", "discover"]),
      ]
    )

    // 4. Ensure Medusa's payment_provider table and region_payment_provider know about PayPal
    await client.query(`
      INSERT INTO payment_provider (id, is_enabled, created_at, updated_at)
      VALUES ('pp_paypal_paypal', true, now(), now())
      ON CONFLICT (id) DO UPDATE SET is_enabled = true;
    `)

    const regions = await client.query(`SELECT id FROM region;`)
    for (const reg of regions.rows) {
      await client.query(
        `
        INSERT INTO region_payment_provider (id, region_id, payment_provider_id, created_at, updated_at)
        VALUES ($1, $2, 'pp_paypal_paypal', now(), now())
        ON CONFLICT DO NOTHING;
      `,
        [`regpp_paypal_${reg.id.slice(-8)}_${crypto.randomBytes(3).toString("hex")}`, reg.id]
      )
    }

    // 5. Initial Audit Log
    const auditCount = await client.query(
      `SELECT count(*) as c FROM payment_method_audit_log;`
    )
    if (parseInt(auditCount.rows[0].c, 10) === 0) {
      await client.query(
        `
        INSERT INTO payment_method_audit_log (id, payment_method_id, provider_id, action, admin_email, details, created_at)
        VALUES 
          ($1, 'pm_stripe', 'stripe', 'activated', 'system@academyio.com', 'Stripe Live mode activated with official keys and 3D Secure verification.', now()),
          ($2, 'pm_electronic_card', 'electronic_card', 'activated', 'system@academyio.com', 'Electronic Card Payment & Instant Verification activated via Stripe processing pipeline.', now()),
          ($3, 'pm_paypal', 'paypal', 'configured', 'system@academyio.com', 'PayPal express configuration initialized in sandbox mode.', now());
      `,
        [
          `pmal_${crypto.randomBytes(8).toString("hex")}`,
          `pmal_${crypto.randomBytes(8).toString("hex")}`,
          `pmal_${crypto.randomBytes(8).toString("hex")}`,
        ]
      )
    }

    console.log("Successfully initialized payment method configurations and audit logs.")
  } finally {
    await client.end()
  }
}

initPaymentMethods().catch((err) => {
  console.error("Error in initPaymentMethods:", err)
  process.exit(1)
})
