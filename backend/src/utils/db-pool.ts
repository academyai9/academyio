import { Pool } from "pg"

let globalPool: Pool | null = null

/**
 * High-performance shared PostgreSQL connection pool singleton.
 * Prevents connection exhaustion on Neon/PostgreSQL and avoids per-route pool allocations.
 */
export function getSharedPool(): Pool {
  if (!globalPool) {
    const rawConnectionString = process.env.DATABASE_URL
    if (!rawConnectionString) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("[SECURITY] DATABASE_URL environment variable is required in production.")
      }
    }
    const effectiveConnectionString =
      rawConnectionString || "postgres://localhost:5432/academyio_medusa"

    let connectionString = effectiveConnectionString
    if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat")) {
      connectionString += connectionString.includes("?") ? "&uselibpqcompat=true" : "?uselibpqcompat=true"
    }

    const isRemote =
      connectionString.includes("neon.tech") ||
      connectionString.includes("sslmode=require") ||
      process.env.NODE_ENV === "production"

    const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false"

    globalPool = new Pool({
      connectionString,
      ssl: isRemote
        ? {
            rejectUnauthorized,
          }
        : undefined,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    globalPool.on("error", (err) => {
      console.error("[Shared PostgreSQL Pool Error]:", err.message)
    })
  }

  return globalPool
}

export default getSharedPool
