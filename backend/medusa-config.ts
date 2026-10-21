import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    path: "/webapp",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000,http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:5173,http://localhost:9000,http://localhost:8000",
      authCors: process.env.AUTH_CORS || "http://localhost:5173,http://localhost:9000,http://localhost:8000",
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
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  ],
})
