import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface ContactInfoRecord {
  id: string
  company_name: string
  street_address: string
  city: string
  state: string
  country: string
  postal_code: string
  formatted_address: string
  support_email: string
  support_phone: string
  support_hours: string
  broadcast_support_note: string
  map_link: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export const DEFAULT_CONTACT_RECORD = {
  id: "company_address",
  company_name: "AcademyIO",
  street_address: "261 Blossom St",
  city: "Dos Palos",
  state: "California",
  country: "United States",
  postal_code: "93620",
  formatted_address: "261 Blossom St, Dos Palos, California, United States - 93620",
  support_email: "support@academyio.com",
  support_phone: "+1 (800) 555-CPE-PASS (toll free)",
  support_hours: "Monday - Friday: 8:00 AM - 6:00 PM EST",
  broadcast_support_note: "Available 30 minutes prior to scheduled start",
  map_link: "https://www.google.com/maps/search/?api=1&query=261+Blossom+St,+Dos+Palos,+California+93620",
  is_active: true,
}

export async function ensureContactInfoTable(pgConnection: any) {
  await pgConnection.raw(`
    CREATE TABLE IF NOT EXISTS company_contact_info (
      id VARCHAR(255) PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL DEFAULT 'AcademyIO',
      street_address VARCHAR(255) NOT NULL DEFAULT '261 Blossom St',
      city VARCHAR(255) NOT NULL DEFAULT 'Dos Palos',
      state VARCHAR(255) NOT NULL DEFAULT 'California',
      country VARCHAR(255) NOT NULL DEFAULT 'United States',
      postal_code VARCHAR(255) NOT NULL DEFAULT '93620',
      formatted_address TEXT NOT NULL DEFAULT '261 Blossom St, Dos Palos, California, United States - 93620',
      support_email VARCHAR(255) NOT NULL DEFAULT 'support@academyio.com',
      support_phone VARCHAR(255) NOT NULL DEFAULT '+1 (800) 555-CPE-PASS (toll free)',
      support_hours VARCHAR(255) NOT NULL DEFAULT 'Monday - Friday: 8:00 AM - 6:00 PM EST',
      broadcast_support_note VARCHAR(255) NOT NULL DEFAULT 'Available 30 minutes prior to scheduled start',
      map_link TEXT DEFAULT 'https://www.google.com/maps/search/?api=1&query=261+Blossom+St,+Dos+Palos,+California+93620',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pgConnection.raw(
    `
    INSERT INTO company_contact_info (
      id, company_name, street_address, city, state, country, postal_code, formatted_address,
      support_email, support_phone, support_hours, broadcast_support_note, map_link, is_active, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
    `,
    [
      DEFAULT_CONTACT_RECORD.id,
      DEFAULT_CONTACT_RECORD.company_name,
      DEFAULT_CONTACT_RECORD.street_address,
      DEFAULT_CONTACT_RECORD.city,
      DEFAULT_CONTACT_RECORD.state,
      DEFAULT_CONTACT_RECORD.country,
      DEFAULT_CONTACT_RECORD.postal_code,
      DEFAULT_CONTACT_RECORD.formatted_address,
      DEFAULT_CONTACT_RECORD.support_email,
      DEFAULT_CONTACT_RECORD.support_phone,
      DEFAULT_CONTACT_RECORD.support_hours,
      DEFAULT_CONTACT_RECORD.broadcast_support_note,
      DEFAULT_CONTACT_RECORD.map_link,
      DEFAULT_CONTACT_RECORD.is_active,
    ]
  )
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureContactInfoTable(pgConnection)

    const result = await pgConnection.raw(
      `SELECT * FROM company_contact_info WHERE id = 'company_address' LIMIT 1;`
    )

    if (result.rows && result.rows.length > 0) {
      return res.json({ contact_info: result.rows[0] })
    }

    return res.json({ contact_info: DEFAULT_CONTACT_RECORD })
  } catch (error: any) {
    console.error("Error fetching admin contact info:", error)
    return res.status(500).json({
      message: "Failed to fetch contact information",
      error: error.message,
      contact_info: DEFAULT_CONTACT_RECORD,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureContactInfoTable(pgConnection)

    const body = req.body as Partial<ContactInfoRecord> & { reset_to_default?: boolean }

    if (body.reset_to_default) {
      await pgConnection.raw(
        `UPDATE company_contact_info SET
          company_name = ?,
          street_address = ?,
          city = ?,
          state = ?,
          country = ?,
          postal_code = ?,
          formatted_address = ?,
          support_email = ?,
          support_phone = ?,
          support_hours = ?,
          broadcast_support_note = ?,
          map_link = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = 'company_address' RETURNING *;`,
        [
          DEFAULT_CONTACT_RECORD.company_name,
          DEFAULT_CONTACT_RECORD.street_address,
          DEFAULT_CONTACT_RECORD.city,
          DEFAULT_CONTACT_RECORD.state,
          DEFAULT_CONTACT_RECORD.country,
          DEFAULT_CONTACT_RECORD.postal_code,
          DEFAULT_CONTACT_RECORD.formatted_address,
          DEFAULT_CONTACT_RECORD.support_email,
          DEFAULT_CONTACT_RECORD.support_phone,
          DEFAULT_CONTACT_RECORD.support_hours,
          DEFAULT_CONTACT_RECORD.broadcast_support_note,
          DEFAULT_CONTACT_RECORD.map_link,
          DEFAULT_CONTACT_RECORD.is_active,
        ]
      )

      return res.json({
        contact_info: DEFAULT_CONTACT_RECORD,
        message: "Contact information reset to official defaults successfully.",
      })
    }

    const company_name = body.company_name ? String(body.company_name).trim() : DEFAULT_CONTACT_RECORD.company_name
    const street_address = body.street_address ? String(body.street_address).trim() : DEFAULT_CONTACT_RECORD.street_address
    const city = body.city ? String(body.city).trim() : DEFAULT_CONTACT_RECORD.city
    const state = body.state ? String(body.state).trim() : DEFAULT_CONTACT_RECORD.state
    const country = body.country ? String(body.country).trim() : DEFAULT_CONTACT_RECORD.country
    const postal_code = body.postal_code ? String(body.postal_code).trim() : DEFAULT_CONTACT_RECORD.postal_code

    // Generate formatted address if empty or not provided
    let formatted_address = body.formatted_address ? String(body.formatted_address).trim() : ""
    if (!formatted_address) {
      formatted_address = `${street_address}, ${city}, ${state}, ${country} - ${postal_code}`
    }

    const support_email = body.support_email ? String(body.support_email).trim() : DEFAULT_CONTACT_RECORD.support_email
    const support_phone = body.support_phone ? String(body.support_phone).trim() : DEFAULT_CONTACT_RECORD.support_phone
    const support_hours = body.support_hours ? String(body.support_hours).trim() : DEFAULT_CONTACT_RECORD.support_hours
    const broadcast_support_note = body.broadcast_support_note
      ? String(body.broadcast_support_note).trim()
      : DEFAULT_CONTACT_RECORD.broadcast_support_note
    const map_link = body.map_link ? String(body.map_link).trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street_address}, ${city}, ${state} ${postal_code}`)}`
    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true

    const updateRes = await pgConnection.raw(
      `INSERT INTO company_contact_info (
        id, company_name, street_address, city, state, country, postal_code, formatted_address,
        support_email, support_phone, support_hours, broadcast_support_note, map_link, is_active, created_at, updated_at
      ) VALUES (
        'company_address', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        street_address = EXCLUDED.street_address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        postal_code = EXCLUDED.postal_code,
        formatted_address = EXCLUDED.formatted_address,
        support_email = EXCLUDED.support_email,
        support_phone = EXCLUDED.support_phone,
        support_hours = EXCLUDED.support_hours,
        broadcast_support_note = EXCLUDED.broadcast_support_note,
        map_link = EXCLUDED.map_link,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *;`,
      [
        company_name,
        street_address,
        city,
        state,
        country,
        postal_code,
        formatted_address,
        support_email,
        support_phone,
        support_hours,
        broadcast_support_note,
        map_link,
        is_active,
      ]
    )

    return res.json({
      contact_info: updateRes.rows[0],
      message: "Company address and contact details updated successfully.",
    })
  } catch (error: any) {
    console.error("Error updating admin contact info:", error)
    return res.status(500).json({
      message: "Failed to update contact information",
      error: error.message,
    })
  }
}
