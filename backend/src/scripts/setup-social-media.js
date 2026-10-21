const { Client } = require("pg");

async function run() {
  const connectionString = process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa";
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to Postgres. Setting up social_media_link table...");

  await client.query(`
    CREATE TABLE IF NOT EXISTS social_media_link (
      id text NOT NULL PRIMARY KEY,
      platform text NOT NULL,
      name text NOT NULL,
      url text NOT NULL,
      icon text NOT NULL DEFAULT 'custom',
      custom_icon_url text NULL,
      label text NULL,
      is_active boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      open_in_new_tab boolean NOT NULL DEFAULT true,
      metadata jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_social_media_active" ON social_media_link (is_active) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS "IDX_social_media_order" ON social_media_link (display_order) WHERE deleted_at IS NULL;
  `);

  // Insert settings for social_media in homepage_section_settings
  await client.query(`
    INSERT INTO homepage_section_settings (section_key, is_enabled, title, subtitle, description)
    VALUES 
      ('social_media', true, 'Follow Us On', 'Stay Connected with AcademyIO', 'Follow our official channels for the latest webinar announcements, CPE updates, and tax law analysis.')
    ON CONFLICT (section_key) DO UPDATE SET
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      description = EXCLUDED.description;
  `);

  // Default platforms
  const defaultPlatforms = [
    {
      id: "soc_linkedin",
      platform: "linkedin",
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/academyio",
      icon: "linkedin",
      label: "LinkedIn",
      is_active: true,
      display_order: 1,
      open_in_new_tab: true,
    },
    {
      id: "soc_youtube",
      platform: "youtube",
      name: "YouTube",
      url: "https://www.youtube.com/@academyio",
      icon: "youtube",
      label: "YouTube",
      is_active: true,
      display_order: 2,
      open_in_new_tab: true,
    },
    {
      id: "soc_twitter",
      platform: "twitter",
      name: "X (Twitter)",
      url: "https://x.com/academyio",
      icon: "twitter",
      label: "X (Twitter)",
      is_active: true,
      display_order: 3,
      open_in_new_tab: true,
    },
    {
      id: "soc_facebook",
      platform: "facebook",
      name: "Facebook",
      url: "https://www.facebook.com/academyio",
      icon: "facebook",
      label: "Facebook",
      is_active: true,
      display_order: 4,
      open_in_new_tab: true,
    },
    {
      id: "soc_instagram",
      platform: "instagram",
      name: "Instagram",
      url: "https://www.instagram.com/academyio",
      icon: "instagram",
      label: "Instagram",
      is_active: true,
      display_order: 5,
      open_in_new_tab: true,
    },
    {
      id: "soc_threads",
      platform: "threads",
      name: "Threads",
      url: "https://www.threads.net/@academyio",
      icon: "threads",
      label: "Threads",
      is_active: true,
      display_order: 6,
      open_in_new_tab: true,
    },
  ];

  for (const p of defaultPlatforms) {
    await client.query(`
      INSERT INTO social_media_link (
        id, platform, name, url, icon, label, is_active, display_order, open_in_new_tab
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        platform = EXCLUDED.platform,
        name = EXCLUDED.name,
        url = EXCLUDED.url,
        icon = EXCLUDED.icon,
        label = EXCLUDED.label,
        is_active = EXCLUDED.is_active,
        display_order = EXCLUDED.display_order,
        open_in_new_tab = EXCLUDED.open_in_new_tab,
        deleted_at = NULL;
    `, [
      p.id, p.platform, p.name, p.url, p.icon, p.label, p.is_active, p.display_order, p.open_in_new_tab
    ]);
  }

  console.log("Seeded default social media platforms.");
  await client.end();
  console.log("Social media database setup complete.");
}

run().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
