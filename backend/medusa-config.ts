import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    path: "/webapp",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions:
      process.env.DATABASE_URL?.includes("neon.tech") ||
      process.env.DATABASE_URL?.includes("sslmode=require")
        ? {
            connection: {
              ssl: { rejectUnauthorized: false },
            },
            pool: {
              min: 2,
              max: 15,
              idleTimeoutMillis: 30000,
            },
          }
        : undefined,
    http: {
      storeCors:
        process.env.STORE_CORS ||
        "http://localhost:8000,http://localhost:3000,https://www.academyio.com,https://academyio.com,/[.]*\\.vercel\\.app$/",
      adminCors:
        process.env.ADMIN_CORS ||
        "http://localhost:5173,http://localhost:9000,http://localhost:8000,https://www.academyio.com,https://academyio.com,/[.]*\\.vercel\\.app$/",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:5173,http://localhost:9000,http://localhost:8000,https://www.academyio.com,https://academyio.com,/[.]*\\.vercel\\.app$/",
      jwtSecret: process.env.JWT_SECRET || "supersecretwebinarplatformjwtkey12345",
      cookieSecret: process.env.COOKIE_SECRET || "supersecretwebinarplatformcookiekey12345",
    }
  },
  modules: [
    {
      resolve: "./src/modules/webinar",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...(process.env.STRIPE_API_KEY
            ? [
                {
                  resolve: "@medusajs/medusa/payment-stripe",
                  id: "stripe",
                  options: {
                    apiKey: process.env.STRIPE_API_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                  },
                },
              ]
            : []),
        ],
      },
    },
    ...(process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET &&
    process.env.S3_ENDPOINT
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url:
                      process.env.S3_FILE_URL ||
                      `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION || "auto",
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT,
                    additional_client_config: {
                      forcePathStyle: true,
                    },
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
