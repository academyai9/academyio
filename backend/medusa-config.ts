import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === 'production'

const WEAK_SECRETS = new Set([
  'supersecret',
  'supersecretwebinarplatformjwtkey12345',
  'supersecretwebinarplatformcookiekey12345',
  'changeme',
])

function resolveSecret(envName: 'JWT_SECRET' | 'COOKIE_SECRET', devFallback: string): string {
  const val = process.env[envName]?.trim()
  if (isProduction) {
    if (!val || val.length < 32 || WEAK_SECRETS.has(val)) {
      throw new Error(
        `[SECURITY] ${envName} must be set to a strong secret (>= 32 chars) in production.`
      )
    }
    return val
  }
  return val || devFallback
}

const jwtSecret = resolveSecret('JWT_SECRET', 'dev-only-local-jwt-secret-do-not-use-in-prod')
const cookieSecret = resolveSecret('COOKIE_SECRET', 'dev-only-local-cookie-secret-do-not-use-in-prod')

const prodDefaultCors = 'https://www.academyio.com,https://academyio.com,https://academyio.vercel.app'
const devDefaultStoreCors = `${prodDefaultCors},http://localhost:8000,http://localhost:3000`
const devDefaultAdminCors = `${prodDefaultCors},http://localhost:5173,http://localhost:9000,http://localhost:8000`
const devDefaultAuthCors = `${prodDefaultCors},http://localhost:5173,http://localhost:9000,http://localhost:8000,http://localhost:3000`

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
              ssl: {
                rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
              },
            },
            pool: {
              min: 2,
              max: 15,
              idleTimeoutMillis: 30000,
            },
          }
        : undefined,
    http: {
      storeCors: process.env.STORE_CORS || (isProduction ? prodDefaultCors : devDefaultStoreCors),
      adminCors: process.env.ADMIN_CORS || (isProduction ? prodDefaultCors : devDefaultAdminCors),
      authCors: process.env.AUTH_CORS || (isProduction ? prodDefaultCors : devDefaultAuthCors),
      jwtSecret,
      cookieSecret,
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
