"use client"

import React, { useEffect, useActionState } from "react"
import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"

type Props = {
  customer: HttpTypes.StoreCustomer & { metadata?: Record<string, any> }
}

const ProfileCredentials: React.FC<Props> = ({ customer }) => {
  const [successState, setSuccessState] = React.useState(false)

  const updateCredentials = async (
    _currentState: Record<string, unknown>,
    formData: FormData
  ) => {
    const rawPtin = (formData.get("ptin") as string || "").trim().toUpperCase()
    const cfp_id = (formData.get("cfp_id") as string || "").trim() || null
    const company_name = (formData.get("company_name") as string || "").trim() || null

    let ptin: string | null = null
    if (rawPtin) {
      if (!/^P\d{8}$/.test(rawPtin)) {
        return {
          success: false,
          error: "Invalid PTIN#. PTIN must start with 'P' followed by 8 digits (no spaces), e.g., P12345678.",
        }
      }
      ptin = rawPtin
    }

    try {
      await updateCustomer({
        company_name,
        metadata: {
          ...(customer.metadata || {}),
          ptin,
          cfp_id,
          company_name,
        },
      })
      return { success: true, error: null }
    } catch (error: any) {
      return { success: false, error: error.toString() }
    }
  }

  const [state, formAction] = useActionState(updateCredentials, {
    error: false,
    success: false,
  })

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  const ptin = customer.metadata?.ptin || "Not provided"
  const cfpId = customer.metadata?.cfp_id || "Not provided"
  const company = customer.company_name || customer.metadata?.company_name || "Not provided"

  const summary = `Firm: ${company} • PTIN: ${ptin} • CFP ID: ${cfpId}`

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Professional Credentials & Firm"
        currentInfo={summary}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error}
        clearState={clearState}
        data-testid="account-credentials-editor"
      >
        <div className="grid grid-cols-1 gap-y-3">
          <Input
            label="Company / Firm Name"
            name="company_name"
            defaultValue={customer.company_name || customer.metadata?.company_name || ""}
          />
          <Input
            label="PTIN# (Enrolled Agents only: Starts with P + 8 digits)"
            name="ptin"
            defaultValue={customer.metadata?.ptin || ""}
          />
          <Input
            label="CFP ID# (For CFP Designation holders only)"
            name="cfp_id"
            defaultValue={customer.metadata?.cfp_id || ""}
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileCredentials
